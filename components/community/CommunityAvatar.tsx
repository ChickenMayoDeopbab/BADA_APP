import type { CommunityAuthorInfo } from "@/api/types";
import { SEMANTIC_COLORS } from "@/design-system";
import { useProfileImage } from "@/hooks/useProfileImage";
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
  // 커뮤니티 API가 완성된 URL 또는 S3 키 중 어느 형태로 내려줘도 표시한다.
  const profileImage = useProfileImage(author.profile_image_url);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-control bg-fill-neutral"
      style={{ width: size, height: size }}
    >
      {profileImage.uri ? (
        <Image
          source={{ uri: profileImage.uri }}
          accessibilityLabel={`${getCommunityAuthorName(author.name)} 프로필`}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={profileImage.onError}
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
