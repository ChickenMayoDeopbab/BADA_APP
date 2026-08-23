import Octicons from "@expo/vector-icons/Octicons";
import { Text, View } from "react-native";

interface TrainingCountLabelProps {
  count: number;
  /** sm: 카드 위(이미지 오버레이), md: 바텀시트 본문 */
  size?: "sm" | "md";
  color?: string;
}

const SIZE_STYLE = {
  sm: { icon: 16, text: "text-caption" },
  md: { icon: 20, text: "text-label" },
} as const;

/** 시나리오 훈련 횟수 표시 (history 아이콘 + N회) */
export default function TrainingCountLabel({
  count,
  size = "sm",
  color = "#F7F7F7",
}: TrainingCountLabelProps) {
  const { icon, text } = SIZE_STYLE[size];

  return (
    <View className="flex-row items-center gap-x-[2px]">
      <Octicons name="history" size={icon} color={color} />
      <Text className={`${text} font-medium`} style={{ color }}>
        {count}회
      </Text>
    </View>
  );
}
