import { SEMANTIC_COLORS } from "@/design-system";
import type { CommunityPost } from "@/types/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import CommunityAvatar from "./CommunityAvatar";
import ReactionPill from "./ReactionPill";

interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: () => void;
}

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 3.4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};

export const getPostCommentCount = (post: CommunityPost) =>
  post.comments.reduce((count, comment) => count + 1 + comment.replies.length, 0);

export default function CommunityPostCard({
  post,
  onPress,
}: CommunityPostCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[113px] justify-center rounded-component bg-background-normal px-[22px] py-3 active:opacity-90"
      style={cardShadow}
    >
      <View className="gap-y-1.5">
        <View className="flex-row items-center gap-x-1.5">
          <CommunityAvatar author={post.author} size={20} />
          <Text className="text-label text-label-alternative">
            {post.author.handle}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          className="text-headline2 font-bold text-label-normal"
        >
          {post.title}
        </Text>
      </View>

      <View className="mt-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2.5">
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="eye"
              size={14}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="text-label text-label-alternative">
              {post.viewCount}
            </Text>
          </View>
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="chatbubble"
              size={14}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="text-label text-label-alternative">
              {getPostCommentCount(post)}
            </Text>
          </View>
          <Text className="text-label text-label-alternative">
            {post.createdAt}
          </Text>
        </View>

        <View className="flex-row items-center gap-x-0.5">
          <ReactionPill type="cheer" count={post.reactions.cheer} compact />
          <ReactionPill type="empathy" count={post.reactions.empathy} compact />
          <ReactionPill type="like" count={post.reactions.like} compact />
        </View>
      </View>
    </Pressable>
  );
}
