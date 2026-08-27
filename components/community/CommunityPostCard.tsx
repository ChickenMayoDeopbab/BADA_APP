import { SEMANTIC_COLORS } from "@/design-system";
import type { CommunityPostSummary } from "@/api/types";
import {
  formatCommunityTimestamp,
  getCommunityAuthorName,
} from "@/utils/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import CommunityAvatar from "./CommunityAvatar";
import ReactionPill from "./ReactionPill";

interface CommunityPostCardProps {
  post: CommunityPostSummary;
  onPress: () => void;
}

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 3.4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};

export default function CommunityPostCard({
  post,
  onPress,
}: CommunityPostCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[145px] justify-center rounded-component bg-background-normal px-[22px] py-3 active:opacity-90"
      style={cardShadow}
    >
      <View className="gap-y-1.5">
        <View className="flex-row items-center gap-x-1.5">
          <CommunityAvatar author={post.author} size={20} />
          <Text className="text-label text-label-alternative">
            {getCommunityAuthorName(post.author.name)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          className="text-headline2 font-bold text-label-normal"
        >
          {post.title}
        </Text>
      </View>

      <View className="relative mt-1.5 h-10 overflow-hidden">
        <Text
          numberOfLines={2}
          ellipsizeMode="clip"
          className="text-label leading-5 text-label-alternative"
        >
          {post.content_preview}
        </Text>
        <View
          pointerEvents="none"
          className="absolute bottom-0 right-0 h-5 w-[45%] flex-row"
        >
          {[0.15, 0.35, 0.6, 0.82, 1].map((opacity) => (
            <View
              key={opacity}
              className="flex-1"
              style={{ backgroundColor: `rgba(254, 254, 254, ${opacity})` }}
            />
          ))}
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2.5">
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="eye"
              size={14}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="text-label text-label-alternative">
              {post.view_count}
            </Text>
          </View>
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="chatbubble"
              size={14}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="text-label text-label-alternative">
              {post.comment_count}
            </Text>
          </View>
          <Text className="text-label text-label-alternative">
            {formatCommunityTimestamp(post.created_at)}
          </Text>
        </View>

        <View className="flex-row items-center gap-x-0.5">
          <ReactionPill type="CHEER" count={post.reactions.cheer ?? 0} compact />
          <ReactionPill type="RELATE" count={post.reactions.relate ?? 0} compact />
          <ReactionPill type="LIKE" count={post.reactions.like ?? 0} compact />
        </View>
      </View>
    </Pressable>
  );
}
