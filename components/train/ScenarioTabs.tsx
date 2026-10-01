import { SCENARIO_TABS, ScenarioTabValue } from "@/constants/train";
import { useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";

export const SCENARIO_TAB_WIDTH = 76;
export const SCENARIO_TAB_GAP = 0;
export const SCENARIO_TAB_HEIGHT = 44;

interface ScenarioTabsProps {
  value: ScenarioTabValue;
  onChange: (value: ScenarioTabValue) => void;
  pageWidth: number;
  tabWidth: number;
  scrollX: Animated.Value;
}

type TabLabelSize = {
  width: number;
  height: number;
};

/** 시나리오 목록 상단 탭 (기본 제공 / 커스텀 / 공유받은) */
export default function ScenarioTabs({
  value,
  onChange,
  pageWidth,
  tabWidth,
  scrollX,
}: ScenarioTabsProps) {
  const [labelSizes, setLabelSizes] = useState<
    Partial<Record<ScenarioTabValue, TabLabelSize>>
  >({});
  const labelWidths = SCENARIO_TABS.map(
    (tab) => labelSizes[tab.value]?.width ?? 0,
  );
  const hasMeasuredLabels = labelWidths.every((width) => width > 0);
  const indicatorTranslateX = scrollX.interpolate({
    inputRange: SCENARIO_TABS.map((_, index) => index * pageWidth),
    outputRange: SCENARIO_TABS.map(
      (_, index) => index * (tabWidth + SCENARIO_TAB_GAP),
    ),
    extrapolate: "clamp",
  });
  const indicatorScaleX = scrollX.interpolate({
    inputRange: SCENARIO_TABS.map((_, index) => index * pageWidth),
    outputRange: labelWidths.map((width) => width / tabWidth),
    extrapolate: "clamp",
  });
  const indicatorTop =
    Math.max(
      ...SCENARIO_TABS.map(
        (tab) => labelSizes[tab.value]?.height ?? 0,
      ),
    ) + 2;

  /** 라벨의 실제 크기를 저장해 밑줄의 위치와 너비를 계산한다. */
  const handleLabelLayout = (
    tab: ScenarioTabValue,
    event: LayoutChangeEvent,
  ) => {
    const { width, height } = event.nativeEvent.layout;
    setLabelSizes((previous) => {
      const current = previous[tab];
      if (current?.width === width && current.height === height) {
        return previous;
      }

      return { ...previous, [tab]: { width, height } };
    });
  };

  return (
    <View className="relative" style={{ height: SCENARIO_TAB_HEIGHT }}>
      <View className="flex-row" style={{ gap: SCENARIO_TAB_GAP }}>
        {SCENARIO_TABS.map((tab, index) => {
          const isSelected = tab.value === value;
          const activeTextOpacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * pageWidth,
              index * pageWidth,
              (index + 1) * pageWidth,
            ],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });

          return (
            <Pressable
              key={tab.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(tab.value)}
              className="items-center"
              style={{ width: tabWidth, height: SCENARIO_TAB_HEIGHT }}
            >
              <View className="relative items-center">
                <Text
                  numberOfLines={1}
                  className="text-center text-headline2 font-medium text-line-normal"
                  onLayout={(event) => handleLabelLayout(tab.value, event)}
                >
                  {tab.label}
                </Text>
                <Animated.Text
                  numberOfLines={1}
                  pointerEvents="none"
                  className="absolute text-center text-headline2 font-medium text-green-40"
                  style={{ opacity: activeTextOpacity }}
                >
                  {tab.label}
                </Animated.Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {hasMeasuredLabels && (
        <Animated.View
          pointerEvents="none"
          className="absolute"
          style={{
            top: indicatorTop,
            width: tabWidth,
            transform: [{ translateX: indicatorTranslateX }],
          }}
        >
          <Animated.View
            className="h-0.5 w-full rounded-pill bg-green-40"
            style={{ transform: [{ scaleX: indicatorScaleX }] }}
          />
        </Animated.View>
      )}
    </View>
  );
}
