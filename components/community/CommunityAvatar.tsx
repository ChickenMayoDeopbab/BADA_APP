import type { CommunityAuthor } from "@/types/community";
import { Image, View } from "react-native";

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
      className="overflow-hidden rounded-control bg-fill-neutral"
      style={{ width: size, height: size }}
    >
      <Image
        source={author.avatar}
        accessibilityLabel={`${author.handle} 프로필 이미지`}
        resizeMode="cover"
        style={{
          position: "absolute",
          left: -size * 0.04,
          top: -size * 0.45,
          width: size * 1.39,
          height: size * 1.73,
        }}
      />
    </View>
  );
}
