import type { CommunityAuthor } from "@/types/community";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

interface CommunityAvatarProps {
  author: CommunityAuthor;
  size?: number;
}

export default function CommunityAvatar({
  author,
  size = 22,
}: CommunityAvatarProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-control bg-fill-neutral"
      style={{ width: size, height: size }}
    >
      <Ionicons
        name="person"
        size={size * 0.82}
        color={SEMANTIC_COLORS.label.alternative}
        accessibilityLabel={`${author.handle} 프로필`}
      />
    </View>
  );
}
