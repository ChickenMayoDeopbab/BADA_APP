import { ScenarioCategory } from "@/api/types";
import { SCENARIO_CATEGORY_CHIPS } from "@/constants/train";
import { Pressable, ScrollView, Text } from "react-native";

interface CategoryChipsProps {
  value: ScenarioCategory | null;
  onChange: (value: ScenarioCategory | null) => void;
}

/** 시나리오 카테고리 필터 칩 행 (전체 / 업무 / 일상 / 학교 / 기타) */
export default function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 4 }}
      // 가로 ScrollView는 세로로도 늘어나려 해서, 남는 공간을 먹고
      // 아래 그리드를 바닥으로 밀어낸다. 칩 높이만 차지하도록 고정한다.
      style={{ flexGrow: 0 }}
    >
      {SCENARIO_CATEGORY_CHIPS.map((chip) => {
        const isSelected = chip.value === value;
        return (
          <Pressable
            key={chip.label}
            onPress={() => onChange(chip.value)}
            // 선택 여부와 무관하게 항상 1px 테두리를 둔다.
            // 선택된 칩에만 border를 주면 그 칩만 넓어져 뒤 칩들이 밀린다.
            className={`h-[30px] items-center justify-center px-[14px] rounded-control border bg-background-alternative active:opacity-70 ${
              isSelected ? "border-green-40" : "border-transparent"
            }`}
          >
            <Text
              className={`text-label ${
                isSelected ? "font-medium text-green-40" : "text-label-normal"
              }`}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
