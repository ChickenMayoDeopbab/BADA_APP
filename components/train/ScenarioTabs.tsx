import { SCENARIO_TABS, ScenarioTabValue } from "@/constants/train";
import { Pressable, Text, View } from "react-native";

interface ScenarioTabsProps {
  value: ScenarioTabValue;
  onChange: (value: ScenarioTabValue) => void;
}

/** 시나리오 목록 상단 탭 (기본 제공 / 커스텀 / 공유받은) */
export default function ScenarioTabs({ value, onChange }: ScenarioTabsProps) {
  return (
    <View className="flex-row items-center gap-x-4">
      {SCENARIO_TABS.map((tab) => {
        const isSelected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            className="items-center gap-y-[6px]"
          >
            <Text
              className={`text-headline2 font-medium text-center ${
                isSelected ? "text-green-40" : "text-neutral-70"
              }`}
            >
              {tab.label}
            </Text>
            {/* 선택된 탭에만 밑줄 표시 */}
            <View
              className={`h-[2px] w-full rounded-pill ${
                isSelected ? "bg-green-40" : "bg-transparent"
              }`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
