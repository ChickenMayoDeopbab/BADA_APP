import {
  CUSTOM_SCENARIO_CATEGORIES,
  CustomScenarioCategory,
} from "@/constants/train";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

interface CategorySelectProps {
  value: CustomScenarioCategory | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (category: CustomScenarioCategory) => void;
}

/** 커스텀 시나리오 카테고리 드롭다운 */
export default function CategorySelect({
  value,
  isOpen,
  onToggle,
  onSelect,
}: CategorySelectProps) {
  const selected = CUSTOM_SCENARIO_CATEGORIES.find((item) => item.value === value);

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        className="flex-row items-center justify-between rounded-component bg-fill-normal px-4 py-[14px] active:bg-fill-pressed"
      >
        <Text
          className={`text-body font-medium ${
            selected ? "text-label-normal" : "text-line-normal"
          }`}
        >
          {selected?.label ?? "카테고리를 선택해주세요."}
        </Text>
        <Ionicons
          name={isOpen ? "caret-up" : "caret-down"}
          size={16}
          color={SEMANTIC_COLORS.line.normal}
        />
      </Pressable>

      {/* 드롭다운이 열렸을 때만 카테고리 목록을 펼친다 */}
      {isOpen && (
        <View className="overflow-hidden rounded-component bg-fill-normal">
          {CUSTOM_SCENARIO_CATEGORIES.map((category) => (
            <Pressable
              key={category.value}
              accessibilityRole="button"
              accessibilityState={{ selected: category.value === value }}
              onPress={() => onSelect(category.value)}
              className={`px-4 py-[14px] active:bg-fill-pressed ${
                category.value === value ? "bg-fill-alternative" : ""
              }`}
            >
              <Text className="text-body font-medium text-label-normal">
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
