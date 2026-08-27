import type { CommunityAuthorInfo } from "@/api/types";
import { SEMANTIC_COLORS } from "@/design-system";
import { getCommunityAuthorName } from "@/utils/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, View } from "react-native";

interface CommunityAvatarProps {
  author: CommunityAuthorInfo;
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
      {author.profile_image_url ? (
        <Image
          source={{ uri: author.profile_image_url }}
          accessibilityLabel={`${getCommunityAuthorName(author.name)} 프로필`}
          style={{ width: size, height: size }}
        />
      ) : (
        <Ionicons
          name="person"
          size={size * 0.82}
          color={SEMANTIC_COLORS.label.alternative}
          accessibilityLabel={`${getCommunityAuthorName(author.name)} 프로필`}
        />
      )}
    </View>
  );
}
