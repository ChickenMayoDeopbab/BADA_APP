import {
  deleteCommunityReaction,
  putCommunityReaction,
} from "@/api/communityApi";
import { getApiErrorMessage } from "@/api/error";
import type {
  CommunityPostDetailResponse,
  CommunityPostListResponse,
  CommunityPostSummary,
  CommunityReactionCounts,
  CommunityReactionKind,
} from "@/api/types";
import { SEMANTIC_COLORS } from "@/design-system";
import { communityQueryKeys } from "@/hooks/useCommunityPosts";
import {
  formatCommunityTimestamp,
  getCommunityAuthorName,
} from "@/utils/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  InfiniteData,
  QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Alert, Pressable, Text, View } from "react-native";
import CommunityAvatar from "./CommunityAvatar";
import ReactionPill from "./ReactionPill";

interface CommunityPostCardProps {
  post: CommunityPostSummary;
  onPress: () => void;
  reactionsInteractive?: boolean;
}

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 3.4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};

const REACTION_COUNT_KEYS: Record<
  CommunityReactionKind,
  "cheer" | "relate" | "like"
> = {
  CHEER: "cheer",
  RELATE: "relate",
  LIKE: "like",
};

interface CachedReactionState {
  reactions: CommunityReactionCounts;
  myReaction: CommunityReactionKind | null;
}

const getOptimisticReactionState = (
  post: CommunityPostSummary,
  requestedKind: CommunityReactionKind,
  previousKind: CommunityReactionKind | null,
): CachedReactionState => {
  const reactions = { ...post.reactions };
  const requestedCountKey = REACTION_COUNT_KEYS[requestedKind];

  if (previousKind === requestedKind) {
    reactions[requestedCountKey] = Math.max(
      0,
      (reactions[requestedCountKey] ?? 0) - 1,
    );
    reactions.total = Math.max(0, (reactions.total ?? 0) - 1);
    return { reactions, myReaction: null };
  }

  if (previousKind) {
    const previousCountKey = REACTION_COUNT_KEYS[previousKind];
    reactions[previousCountKey] = Math.max(
      0,
      (reactions[previousCountKey] ?? 0) - 1,
    );
  } else {
    reactions.total = (reactions.total ?? 0) + 1;
  }

  reactions[requestedCountKey] = (reactions[requestedCountKey] ?? 0) + 1;
  return { reactions, myReaction: requestedKind };
};

export default function CommunityPostCard({
  post,
  onPress,
  reactionsInteractive = true,
}: CommunityPostCardProps) {
  const queryClient = useQueryClient();

  const setCachedReactionState = ({
    reactions,
    myReaction,
  }: CachedReactionState) => {
    queryClient.setQueriesData<InfiniteData<CommunityPostListResponse>>(
      { queryKey: communityQueryKeys.postLists() },
      (currentLists) =>
        currentLists
          ? {
              ...currentLists,
              pages: currentLists.pages.map((page) => ({
                ...page,
                posts: page.posts.map((item) =>
                  item.post_id === post.post_id
                    ? {
                        ...item,
                        reactions,
                        my_reaction: myReaction,
                      }
                    : item,
                ),
              })),
            }
          : currentLists,
    );

    queryClient.setQueryData<CommunityPostDetailResponse>(
      communityQueryKeys.post(post.post_id),
      (currentPost) =>
        currentPost
          ? {
              ...currentPost,
              reactions,
              my_reaction: myReaction,
            }
          : currentPost,
    );
  };

  const reactionMutation = useMutation({
    mutationFn: async ({
      kind,
      previousKind,
    }: {
      kind: CommunityReactionKind;
      previousKind: CommunityReactionKind | null;
    }) => {
      if (kind === previousKind) {
        await deleteCommunityReaction(post.post_id);
        return null;
      }

      return putCommunityReaction(post.post_id, { kind });
    },
    onMutate: async ({ kind, previousKind }) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: communityQueryKeys.postLists(),
        }),
        queryClient.cancelQueries({
          queryKey: communityQueryKeys.post(post.post_id),
        }),
      ]);

      const previousLists =
        queryClient.getQueriesData<InfiniteData<CommunityPostListResponse>>({
          queryKey: communityQueryKeys.postLists(),
        });
      const previousDetail =
        queryClient.getQueryData<CommunityPostDetailResponse>(
          communityQueryKeys.post(post.post_id),
        );

      setCachedReactionState(
        getOptimisticReactionState(post, kind, previousKind),
      );
      return { previousLists, previousDetail };
    },
    onSuccess: (reactionState, request) => {
      if (!reactionState) return;

      setCachedReactionState({
        reactions: reactionState.reactions,
        myReaction: reactionState.my_reaction ?? request.kind,
      });
    },
    onError: (error, _request, context) => {
      context?.previousLists.forEach(
        ([queryKey, previousData]: [
          QueryKey,
          InfiniteData<CommunityPostListResponse> | undefined,
        ]) => {
          queryClient.setQueryData(queryKey, previousData);
        },
      );
      queryClient.setQueryData(
        communityQueryKeys.post(post.post_id),
        context?.previousDetail,
      );
      Alert.alert(
        "공감 반영 실패",
        getApiErrorMessage(error, "공감 상태를 변경하지 못했어요."),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.post(post.post_id),
      });
    },
  });

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
          {(["CHEER", "RELATE", "LIKE"] as const).map((reaction) => (
            <ReactionPill
              key={reaction}
              type={reaction}
              count={post.reactions[REACTION_COUNT_KEYS[reaction]] ?? 0}
              compact
              selected={post.my_reaction === reaction}
              loading={reactionsInteractive && reactionMutation.isPending}
              onPress={
                reactionsInteractive
                  ? (event) => {
                      event.stopPropagation();
                      reactionMutation.mutate({
                        kind: reaction,
                        previousKind: post.my_reaction ?? null,
                      });
                    }
                  : undefined
              }
            />
          ))}
        </View>
      </View>
    </Pressable>
  );
}
