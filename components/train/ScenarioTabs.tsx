import { SCENARIO_TABS, ScenarioTabValue } from "@/constants/train";
import { Animated, Pressable, Text, View } from "react-native";

export const SCENARIO_TAB_WIDTH = 92;
export const SCENARIO_TAB_GAP = 3;

interface ScenarioTabsProps {
  value: ScenarioTabValue;
  onChange: (value: ScenarioTabValue) => void;
  pageWidth: number;
  tabWidth: number;
  fontScale: number;
  scrollX: Animated.Value;
}

/** 시나리오 목록 상단 탭 (기본 제공 / 커스텀 / 공유받은) */
export default function ScenarioTabs({
  value,
  onChange,
  pageWidth,
  tabWidth,
  fontScale,
  scrollX,
}: ScenarioTabsProps) {
  const indicatorTranslateX = scrollX.interpolate({
    inputRange: SCENARIO_TABS.map((_, index) => index * pageWidth),
    outputRange: SCENARIO_TABS.map(
      (_, index) => index * (tabWidth + SCENARIO_TAB_GAP),
    ),
    extrapolate: "clamp",
  });

  return (
    <View className="relative h-[53px]">
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
              style={{ width: tabWidth }}
            >
              <Text
                numberOfLines={1}
                className="text-center text-headline2 font-medium text-line-normal"
                style={{ width: tabWidth }}
              >
                {tab.label}
              </Text>
              <Animated.Text
                numberOfLines={1}
                pointerEvents="none"
                className="absolute text-center text-headline2 font-medium text-green-40"
                style={{ width: tabWidth, opacity: activeTextOpacity }}
              >
                {tab.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        className="absolute h-0.5 rounded-pill bg-green-40"
        style={{
          top: Math.min(45, 8 + 23.4 * fontScale),
          width: tabWidth,
          transform: [{ translateX: indicatorTranslateX }],
        }}
      />
    </View>
  );
}
