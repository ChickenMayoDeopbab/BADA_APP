import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

interface CommunityHeaderProps {
  title: string;
  back?: boolean;
  right?: ReactNode;
}

export default function CommunityHeader({
  title,
  back = true,
  right,
}: CommunityHeaderProps) {
  return (
    <View className="h-16 flex-row items-center justify-between px-2">
      <View className="h-16 w-16 items-center justify-center">
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={8}
            onPress={() => router.back()}
            className="h-16 w-16 items-center justify-center active:opacity-60"
          >
            <Ionicons
              name="chevron-back"
              size={32}
              color={SEMANTIC_COLORS.label.alternative}
            />
          </Pressable>
        )}
      </View>

      <Text className="text-headline1 font-bold text-label-neutral">
        {title}
      </Text>

      <View className="h-16 w-16 items-center justify-center">{right}</View>
    </View>
  );
}
