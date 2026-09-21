import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

type AuthFlowHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function AuthFlowHeader({
  title,
  onBack,
}: AuthFlowHeaderProps) {
  return (
    <View className="relative flex-row items-center justify-center h-14">
      <Pressable
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
        className="absolute left-0 items-center justify-center w-11 h-11"
        hitSlop={8}
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={28} color={SEMANTIC_COLORS.label.alternative} />
      </Pressable>
      <Text className="text-headline1 font-bold text-label-neutral">{title}</Text>
    </View>
  );
}
