import { SCENARIO_TABS, ScenarioTabValue } from "@/constants/train";
import { Animated, Pressable, Text, View } from "react-native";

// 전체 길이는 222px로 짧게 유지하면서 모든 한글 라벨이 온전히 보이는 폭이다.
// 고정 폭을 써야 커뮤니티와 동일한 native-driver translateX 애니메이션이 동작한다.
const TAB_WIDTH = 72;
const TAB_GAP = 3;

interface ScenarioTabsProps {
  value: ScenarioTabValue;
  onChange: (value: ScenarioTabValue) => void;
  pageWidth: number;
  scrollX: Animated.Value;
}

/** 시나리오 목록 상단 탭 (기본 제공 / 커스텀 / 공유받은) */
export default function ScenarioTabs({
  value,
  onChange,
  pageWidth,
  scrollX,
}: ScenarioTabsProps) {
  const indicatorTranslateX = scrollX.interpolate({
    inputRange: SCENARIO_TABS.map((_, index) => index * pageWidth),
    outputRange: SCENARIO_TABS.map(
      (_, index) => index * (TAB_WIDTH + TAB_GAP),
    ),
    extrapolate: "clamp",
  });

  return (
    <View className="relative">
      <View className="flex-row" style={{ gap: TAB_GAP }}>
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
              style={{ width: TAB_WIDTH }}
            >
              <Text
                numberOfLines={1}
                className="text-center text-headline2 font-medium text-line-normal"
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
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        className="absolute top-[31px] h-0.5 rounded-pill bg-green-40"
        style={{
          width: TAB_WIDTH,
          transform: [{ translateX: indicatorTranslateX }],
        }}
      />
    </View>
  );
}
