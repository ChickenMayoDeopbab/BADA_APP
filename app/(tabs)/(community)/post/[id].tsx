import {
  deleteCommunityComment,
  deleteCommunityPost,
  deleteCommunityReaction,
  patchCommunityComment,
  patchCommunityPost,
  postCommunityComment,
  putCommunityReaction,
} from "@/api/communityApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/api/error";
import type {
  CommunityCommentListResponse,
  CommunityCommentResponse,
  CommunityPostDetailResponse,
  CommunityReactionKind,
} from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import CommunityHeader from "@/components/community/CommunityHeader";
import DeleteCommunityCommentModal from "@/components/community/DeleteCommunityCommentModal";
import DeleteCommunityPostModal from "@/components/community/DeleteCommunityPostModal";
import ReactionPill from "@/components/community/ReactionPill";
import { SEMANTIC_COLORS } from "@/design-system";
import {
  communityQueryKeys,
  useCommunityComments,
  useCommunityPost,
} from "@/hooks/useCommunityPosts";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import {
  formatCommunityTimestamp,
  getCommunityAuthorName,
} from "@/utils/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const REACTION_COUNT_KEYS: Record<
  CommunityReactionKind,
  "cheer" | "relate" | "like"
> = {
  CHEER: "cheer",
  RELATE: "relate",
  LIKE: "like",
};

const editorLayoutTransition = LinearTransition.duration(180).easing(
  Easing.inOut(Easing.quad),
);

const replaceCommunityComment = (
  currentComments: CommunityCommentListResponse,
  updatedComment: CommunityCommentResponse,
): CommunityCommentListResponse => ({
  comments: currentComments.comments.map((comment) => {
    if (comment.comment_id === updatedComment.comment_id) {
      return { ...updatedComment, replies: comment.replies ?? [] };
    }

    return {
      ...comment,
      replies: (comment.replies ?? []).map((reply) =>
        reply.comment_id === updatedComment.comment_id ? updatedComment : reply,
      ),
    };
  }),
});

interface CommentActionButtonsProps {
  canEdit: boolean;
  canDelete: boolean;
  editLabel: string;
  deleteLabel: string;
  editDisabled: boolean;
  deleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function CommentActionButtons({
  canEdit,
  canDelete,
  editLabel,
  deleteLabel,
  editDisabled,
  deleteDisabled,
  onEdit,
  onDelete,
}: CommentActionButtonsProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <View className="ml-2 flex-row items-center gap-x-1">
      {canEdit && (
        <Pressable
          accessibilityLabel={editLabel}
          disabled={editDisabled}
          hitSlop={8}
          onPress={onEdit}
          className="p-1 active:opacity-60"
        >
          <Ionicons
            name="pencil"
            size={18}
            color={SEMANTIC_COLORS.line.normal}
          />
        </Pressable>
      )}
      {canDelete && (
        <Pressable
          accessibilityLabel={deleteLabel}
          disabled={deleteDisabled}
          hitSlop={8}
          onPress={onDelete}
          className="p-1 active:opacity-60"
        >
          <Ionicons
            name="trash"
            size={19}
            color={SEMANTIC_COLORS.line.normal}
          />
        </Pressable>
      )}
    </View>
  );
}

interface CommentEditorProps {
  value: string;
  errorMessage: string | null;
  isSaving: boolean;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

function CommentEditor({
  value,
  errorMessage,
  isSaving,
  onChangeText,
  onCancel,
  onSave,
}: CommentEditorProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      layout={editorLayoutTransition}
    >
      <View>
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChangeText}
          maxLength={1000}
          multiline
          textAlignVertical="top"
          editable={!isSaving}
          selectionColor={SEMANTIC_COLORS.primary.normal}
          className="min-h-[32px] max-h-28 rounded-component bg-fill-neutral px-2.5 py-1 text-body text-label-normal"
        />
        {errorMessage && (
          <Text className="mt-1 text-caption text-status-error">
            {errorMessage}
          </Text>
        )}
        <View className="mt-1.5 flex-row justify-end gap-x-1.5">
          <View className="w-[48px]">
            <CustomButton
              label="취소"
              variant="sm"
              tone="neutral"
              disabled={isSaving}
              onPress={onCancel}
            />
          </View>
          <View className="w-[48px]">
            <CustomButton
              label="저장"
              variant="sm"
              tone="primary"
              disabled={!value.trim() || isSaving}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function CommunityPostDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const postId = Number(rawId);
  const queryClient = useQueryClient();
  const postQuery = useCommunityPost(postId);
  const commentsQuery = useCommunityComments(postId);
  const currentUserIdQuery = useCurrentUserId();
  const post = postQuery.data;
  const comments = useMemo(
    () => commentsQuery.data?.comments ?? [],
    [commentsQuery.data],
  );

  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    new Set(),
  );
  const [replyTarget, setReplyTarget] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [editCommentError, setEditCommentError] = useState<string | null>(null);
  const [deletePostModalVisible, setDeletePostModalVisible] = useState(false);
  const [deletePostError, setDeletePostError] = useState<string | null>(null);
  const [isPostMenuVisible, setIsPostMenuVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    commentId: number;
    removedCount: number;
  } | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const reactionMutation = useMutation({
    mutationFn: async ({
      kind,
      previousKind,
    }: {
      kind: CommunityReactionKind;
      previousKind: CommunityReactionKind | null;
    }) => {
      if (previousKind === kind) {
        await deleteCommunityReaction(postId);
        return null;
      }

      return putCommunityReaction(postId, { kind });
    },
    onMutate: ({ kind, previousKind }) => {
      const previousPost =
        queryClient.getQueryData<CommunityPostDetailResponse>(
          communityQueryKeys.post(postId),
        );

      queryClient.setQueryData<CommunityPostDetailResponse>(
        communityQueryKeys.post(postId),
        (currentPost) => {
          if (!currentPost) return currentPost;

          const nextReactions = { ...(currentPost.reactions ?? {}) };
          const requestedCountKey = REACTION_COUNT_KEYS[kind];

          if (previousKind === kind) {
            nextReactions[requestedCountKey] = Math.max(
              0,
              (nextReactions[requestedCountKey] ?? 0) - 1,
            );
            nextReactions.total = Math.max(
              0,
              (nextReactions.total ?? 0) - 1,
            );
          } else {
            if (previousKind) {
              const previousCountKey = REACTION_COUNT_KEYS[previousKind];
              nextReactions[previousCountKey] = Math.max(
                0,
                (nextReactions[previousCountKey] ?? 0) - 1,
              );
            } else {
              nextReactions.total = (nextReactions.total ?? 0) + 1;
            }

            nextReactions[requestedCountKey] =
              (nextReactions[requestedCountKey] ?? 0) + 1;
          }

          return {
            ...currentPost,
            reactions: nextReactions,
            my_reaction: previousKind === kind ? null : kind,
          };
        },
      );

      return { previousPost };
    },
    onSuccess: (reactionState, request) => {
      if (reactionState) {
        queryClient.setQueryData<CommunityPostDetailResponse>(
          communityQueryKeys.post(postId),
          (currentPost) =>
            currentPost
              ? {
                  ...currentPost,
                  reactions: reactionState.reactions,
                  my_reaction: reactionState.my_reaction ?? request.kind,
                }
              : currentPost,
        );
      }
      setInteractionError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: (error, _request, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(
          communityQueryKeys.post(postId),
          context.previousPost,
        );
      }
      setInteractionError(
        getApiErrorMessage(error, "공감 상태를 변경하지 못했어요."),
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; parent_comment_id?: number }) =>
      postCommunityComment(postId, data),
    onSuccess: (createdComment, request) => {
      queryClient.setQueryData<CommunityCommentListResponse>(
        communityQueryKeys.comments(postId),
        (currentComments) => {
          if (!currentComments) return currentComments;

          if (request.parent_comment_id) {
            return {
              comments: currentComments.comments.map((comment) =>
                comment.comment_id === request.parent_comment_id
                  ? {
                      ...comment,
                      replies: [...(comment.replies ?? []), createdComment],
                    }
                  : comment,
              ),
            };
          }

          return {
            comments: [
              ...currentComments.comments,
              { ...createdComment, replies: [] },
            ],
          };
        },
      );
      queryClient.setQueryData<CommunityPostDetailResponse>(
        communityQueryKeys.post(postId),
        (currentPost) =>
          currentPost
            ? {
                ...currentPost,
                comment_count: (currentPost.comment_count ?? 0) + 1,
              }
            : currentPost,
      );

      if (request.parent_comment_id) {
        setExpandedReplies((current) =>
          new Set(current).add(request.parent_comment_id!),
        );
      }
      setMessage("");
      setReplyTarget(null);
      setInteractionError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(postId),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: (error) => {
      setInteractionError(
        getApiErrorMessage(error, "댓글을 등록하지 못했어요."),
      );
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      patchCommunityPost(postId, data),
    onSuccess: (updatedPost) => {
      queryClient.setQueryData(
        communityQueryKeys.post(postId),
        updatedPost,
      );
      setEditingPost(false);
      setInteractionError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: (error) => {
      setInteractionError(
        getApiErrorMessage(error, "게시물을 수정하지 못했어요."),
      );
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deleteCommunityPost(postId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: communityQueryKeys.post(postId),
      });
      setDeletePostModalVisible(false);
      setDeletePostError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
      router.replace("/(tabs)/(community)/community");
    },
    onError: (error) => {
      setDeletePostError(
        getApiErrorMessage(error, "게시글을 삭제하지 못했어요."),
      );
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => patchCommunityComment(commentId, { content }),
    onSuccess: (updatedComment) => {
      queryClient.setQueryData<CommunityCommentListResponse>(
        communityQueryKeys.comments(postId),
        (currentComments) =>
          currentComments
            ? replaceCommunityComment(currentComments, updatedComment)
            : currentComments,
      );
      setEditingCommentId(null);
      setEditCommentContent("");
      setEditCommentError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(postId),
      });
    },
    onError: (error) => {
      setEditCommentError(
        getApiErrorMessage(error, "댓글을 수정하지 못했어요."),
      );
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ commentId }: { commentId: number; removedCount: number }) =>
      deleteCommunityComment(commentId),
    onSuccess: (_, target) => {
      queryClient.setQueryData<CommunityCommentListResponse>(
        communityQueryKeys.comments(postId),
        (currentComments) =>
          currentComments
            ? {
                comments: currentComments.comments
                  .filter(
                    (comment) => comment.comment_id !== target.commentId,
                  )
                  .map((comment) => ({
                    ...comment,
                    replies: (comment.replies ?? []).filter(
                      (reply) => reply.comment_id !== target.commentId,
                    ),
                  })),
              }
            : currentComments,
      );
      queryClient.setQueryData<CommunityPostDetailResponse>(
        communityQueryKeys.post(postId),
        (currentPost) =>
          currentPost
            ? {
                ...currentPost,
                comment_count: Math.max(
                  0,
                  (currentPost.comment_count ?? 0) - target.removedCount,
                ),
              }
            : currentPost,
      );
      if (replyTarget === target.commentId) setReplyTarget(null);
      if (editingCommentId === target.commentId) {
        setEditingCommentId(null);
        setEditCommentContent("");
        setEditCommentError(null);
      }
      setDeleteTarget(null);
      setDeleteModalError(null);
      setInteractionError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(postId),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: (error) => {
      setDeleteModalError(
        getApiErrorMessage(error, "댓글을 삭제하지 못했어요."),
      );
    },
  });

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const startEditingPost = () => {
    if (!post) return;
    setIsPostMenuVisible(false);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditingPost(true);
    setInteractionError(null);
  };

  const savePost = () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content || updatePostMutation.isPending) return;
    updatePostMutation.mutate({ title, content });
  };

  const startEditingComment = (commentId: number, content: string) => {
    setEditingCommentId(commentId);
    setEditCommentContent(content);
    setEditCommentError(null);
    setReplyTarget(null);
  };

  const cancelEditingComment = () => {
    if (updateCommentMutation.isPending) return;
    setEditingCommentId(null);
    setEditCommentContent("");
    setEditCommentError(null);
  };

  const saveComment = () => {
    const content = editCommentContent.trim();
    if (!editingCommentId || !content || updateCommentMutation.isPending) {
      return;
    }

    updateCommentMutation.mutate({ commentId: editingCommentId, content });
  };

  const selectReplyTarget = (commentId: number) => {
    setReplyTarget(commentId);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const confirmDeleteComment = (commentId: number, removedCount: number) => {
    setDeleteModalError(null);
    setDeleteTarget({ commentId, removedCount });
  };

  const submitMessage = () => {
    const content = message.trim();
    if (!content || commentMutation.isPending) return;

    commentMutation.mutate({
      content,
      parent_comment_id: replyTarget ?? undefined,
    });
  };

  const commentCount = commentsQuery.data
    ? comments.reduce(
        (count, comment) => count + 1 + (comment.replies?.length ?? 0),
        0,
      )
    : (post?.comment_count ?? 0);
  const replyTargetComment = comments.find(
    (comment) => comment.comment_id === replyTarget,
  );

  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
        <CommunityHeader title="게시물" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-body text-label-alternative">
            올바르지 않은 게시물 주소예요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (postQuery.isPending) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
        <CommunityHeader title="게시물" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-3 text-body text-label-alternative">
            게시물을 불러오는 중이에요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (postQuery.isError || !post) {
    const notFound = getApiErrorStatus(postQuery.error) === 404;
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
        <CommunityHeader title="게시물" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-body text-label-alternative">
            {notFound
              ? "게시물을 찾을 수 없어요."
              : getApiErrorMessage(
                  postQuery.error,
                  "게시물을 불러오지 못했어요.",
                )}
          </Text>
          {!notFound && (
            <Pressable
              onPress={() => void postQuery.refetch()}
              className="mt-4 rounded-component bg-fill-normal px-4 py-2 active:opacity-70"
            >
              <Text className="text-label font-medium text-label-normal">
                다시 시도
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const reactionCounts = post.reactions ?? {};
  const currentUserId = currentUserIdQuery.data;
  const isPostAuthor = currentUserId === post.author.user_id;
  const postMetadata = (
    <View className="mt-1.5 flex-row items-center justify-between">
      <View className="flex-row items-center gap-x-1.5">
        <CommunityAvatar author={post.author} size={22} />
        <Text className="text-body text-label-alternative">
          {getCommunityAuthorName(post.author.name)}
        </Text>
      </View>
      <View className="flex-row items-center gap-x-2.5">
        <View className="flex-row items-center gap-x-[3px]">
          <Ionicons
            name="eye"
            size={20}
            color={SEMANTIC_COLORS.label.alternative}
          />
          <Text className="text-body text-label-alternative">
            {post.view_count}
          </Text>
        </View>
        <View className="flex-row items-center gap-x-[3px]">
          <Ionicons
            name="chatbubble"
            size={20}
            color={SEMANTIC_COLORS.label.alternative}
          />
          <Text className="text-body text-label-alternative">
            {commentCount}
          </Text>
        </View>
        <Text className="text-body text-label-alternative">
          {formatCommunityTimestamp(post.created_at)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-background-alternative"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {isPostMenuVisible && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="게시글 설정 메뉴 닫기"
            onPress={() => setIsPostMenuVisible(false)}
            className="absolute inset-0 z-20"
          />
        )}

        <View className="relative z-30">
          <CommunityHeader
            title="게시물"
            right={
              isPostAuthor && !editingPost ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="게시글 설정"
                  accessibilityState={{ expanded: isPostMenuVisible }}
                  hitSlop={8}
                  onPress={() =>
                    setIsPostMenuVisible((isVisible) => !isVisible)
                  }
                  className="h-16 w-16 items-center justify-center active:opacity-60"
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={26}
                    color={SEMANTIC_COLORS.label.alternative}
                  />
                </Pressable>
              ) : null
            }
          />

          {isPostAuthor && isPostMenuVisible && !editingPost && (
            <View
              className="absolute right-4 top-[53px] z-30 h-[104px] w-40 overflow-hidden rounded-component bg-background-normal"
              style={{
                shadowColor: "#000000",
                shadowOpacity: 0.12,
                shadowRadius: 4.3,
                shadowOffset: { width: 0, height: 0 },
                elevation: 5,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="게시글 수정하기"
                disabled={updatePostMutation.isPending}
                onPress={startEditingPost}
                className="h-[52px] justify-center px-3 active:bg-fill-neutral"
              >
                <Text className="text-headline2 font-medium text-label-normal">
                  게시글 수정하기
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="게시글 삭제하기"
                disabled={deletePostMutation.isPending}
                onPress={() => {
                  setIsPostMenuVisible(false);
                  setDeletePostError(null);
                  setDeletePostModalVisible(true);
                }}
                className="h-[52px] justify-center px-3 active:bg-fill-neutral"
              >
                <Text className="text-headline2 font-medium text-label-normal">
                  게시글 삭제하기
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 33,
            paddingTop: 16,
            paddingBottom: 18,
          }}
        >
          {editingPost ? (
            <Animated.View
              key="post-editor"
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              layout={editorLayoutTransition}
            >
              <View>
                <TextInput
                  autoFocus
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={100}
                  editable={!updatePostMutation.isPending}
                  selectionColor={SEMANTIC_COLORS.primary.normal}
                  className="min-h-[51px] rounded-component bg-fill-neutral px-3 py-2 text-title2 font-bold text-label-normal"
                />

                {postMetadata}

                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  maxLength={5000}
                  multiline
                  textAlignVertical="top"
                  editable={!updatePostMutation.isPending}
                  selectionColor={SEMANTIC_COLORS.primary.normal}
                  className="mt-4 min-h-[275px] rounded-component bg-fill-neutral px-3 py-3 text-body text-label-normal"
                />

                <View className="mt-2 flex-row justify-end gap-x-1.5 pr-1">
                  <View className="w-[52px]">
                    <CustomButton
                      label="취소"
                      variant="sm"
                      tone="neutral"
                      disabled={updatePostMutation.isPending}
                      onPress={() => setEditingPost(false)}
                    />
                  </View>
                  <View className="w-[52px]">
                    <CustomButton
                      label="저장"
                      variant="sm"
                      tone="primary"
                      disabled={
                        !editTitle.trim() ||
                        !editContent.trim() ||
                        updatePostMutation.isPending
                      }
                      onPress={savePost}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              key="post-content"
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              layout={editorLayoutTransition}
            >
              <View>
                <Text className="text-title2 font-bold text-label-normal">
                  {post.title}
                </Text>
                {postMetadata}
                <Text className="mt-4 text-body text-label-normal">
                  {post.content}
                </Text>
              </View>
            </Animated.View>
          )}

          <View className="mt-5 flex-row justify-end gap-x-1">
            {(["CHEER", "RELATE", "LIKE"] as const).map((reaction) => (
              <ReactionPill
                key={reaction}
                type={reaction}
                count={reactionCounts[REACTION_COUNT_KEYS[reaction]] ?? 0}
                selected={post.my_reaction === reaction}
                loading={reactionMutation.isPending}
                onPress={() =>
                  reactionMutation.mutate({
                    kind: reaction,
                    previousKind: post.my_reaction ?? null,
                  })
                }
              />
            ))}
          </View>

          {interactionError && (
            <Text className="mt-2 text-right text-caption text-status-error">
              {interactionError}
            </Text>
          )}

          <View className="mt-9 flex-row items-center gap-x-2">
            <Text className="text-headline2 font-bold text-label-neutral">
              댓글
            </Text>
            <Text className="text-body text-label-neutral">{commentCount}</Text>
          </View>

          {commentsQuery.isPending ? (
            <ActivityIndicator className="py-10" />
          ) : commentsQuery.isError ? (
            <View className="items-center py-10">
              <Text className="text-center text-body text-label-alternative">
                {getApiErrorMessage(
                  commentsQuery.error,
                  "댓글을 불러오지 못했어요.",
                )}
              </Text>
              <Pressable
                onPress={() => void commentsQuery.refetch()}
                className="mt-3 rounded-component bg-fill-normal px-4 py-2"
              >
                <Text className="text-label font-medium text-label-normal">
                  다시 시도
                </Text>
              </Pressable>
            </View>
          ) : comments.length === 0 ? (
            <Text className="py-10 text-center text-body text-label-alternative">
              첫 댓글을 남겨보세요.
            </Text>
          ) : (
            <View className="mt-3 gap-y-4">
              {comments.map((comment) => {
                const replies = comment.replies ?? [];
                const repliesVisible = expandedReplies.has(comment.comment_id);
                const canEditComment =
                  currentUserId === comment.author.user_id;
                const canDeleteComment = canEditComment;
                const isEditingComment =
                  editingCommentId === comment.comment_id;
                return (
                  <View key={comment.comment_id}>
                    <View className="flex-row items-start gap-x-1.5">
                      <CommunityAvatar author={comment.author} size={22} />
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-x-1">
                            <Text className="text-label text-label-alternative">
                              {getCommunityAuthorName(comment.author.name)}
                            </Text>
                            <Text className="text-label text-label-alternative">
                              ·
                            </Text>
                            <Text className="text-label text-label-alternative">
                              {formatCommunityTimestamp(comment.created_at)}
                            </Text>
                          </View>
                          <CommentActionButtons
                            canEdit={canEditComment}
                            canDelete={canDeleteComment}
                            editLabel="댓글 수정"
                            deleteLabel="댓글 삭제"
                            editDisabled={updateCommentMutation.isPending}
                            deleteDisabled={deleteCommentMutation.isPending}
                            onEdit={() =>
                              startEditingComment(
                                comment.comment_id,
                                comment.content,
                              )
                            }
                            onDelete={() =>
                              confirmDeleteComment(
                                comment.comment_id,
                                1 + replies.length,
                              )
                            }
                          />
                        </View>

                        {isEditingComment ? (
                          <CommentEditor
                            value={editCommentContent}
                            errorMessage={editCommentError}
                            isSaving={updateCommentMutation.isPending}
                            onChangeText={setEditCommentContent}
                            onCancel={cancelEditingComment}
                            onSave={saveComment}
                          />
                        ) : (
                          <Pressable
                            onPress={() =>
                              selectReplyTarget(comment.comment_id)
                            }
                            className="py-0.5"
                          >
                            <Text
                              className={`text-body ${
                                replyTarget === comment.comment_id
                                  ? "text-status-info"
                                  : "text-label-normal"
                              }`}
                            >
                              {comment.content}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {repliesVisible &&
                      replies.map((reply) => {
                        const canEditReply =
                          currentUserId === reply.author.user_id;
                        const canDeleteReply = canEditReply;
                        const isEditingReply =
                          editingCommentId === reply.comment_id;

                        return (
                          <View
                            key={reply.comment_id}
                            className="ml-7 mt-3 flex-row items-start gap-x-1.5"
                          >
                            <CommunityAvatar author={reply.author} size={22} />
                            <View className="flex-1">
                              <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-x-1">
                                  <Text className="text-label text-label-alternative">
                                    {getCommunityAuthorName(reply.author.name)}
                                  </Text>
                                  <Text className="text-label text-label-alternative">
                                    ·
                                  </Text>
                                  <Text className="text-label text-label-alternative">
                                    {formatCommunityTimestamp(reply.created_at)}
                                  </Text>
                                </View>
                                <CommentActionButtons
                                  canEdit={canEditReply}
                                  canDelete={canDeleteReply}
                                  editLabel="답글 수정"
                                  deleteLabel="답글 삭제"
                                  editDisabled={
                                    updateCommentMutation.isPending
                                  }
                                  deleteDisabled={
                                    deleteCommentMutation.isPending
                                  }
                                  onEdit={() =>
                                    startEditingComment(
                                      reply.comment_id,
                                      reply.content,
                                    )
                                  }
                                  onDelete={() =>
                                    confirmDeleteComment(reply.comment_id, 1)
                                  }
                                />
                              </View>

                              {isEditingReply ? (
                                <CommentEditor
                                  value={editCommentContent}
                                  errorMessage={editCommentError}
                                  isSaving={updateCommentMutation.isPending}
                                  onChangeText={setEditCommentContent}
                                  onCancel={cancelEditingComment}
                                  onSave={saveComment}
                                />
                              ) : (
                                <Text className="mt-0.5 text-body text-label-normal">
                                  {reply.content}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}

                    {replies.length > 0 && (
                      <Pressable
                        onPress={() => toggleReplies(comment.comment_id)}
                        className="mt-2 self-end py-1"
                      >
                        <Text className="text-label text-label-alternative">
                          {repliesVisible
                            ? "답글 가리기"
                            : `답글 ${replies.length}개 보기`}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {replyTargetComment && (
          <View className="items-end px-8 pb-1">
            <View className="flex-row items-center gap-x-1.5 rounded-[11px] bg-background-normal px-2 py-1">
              <View className="flex-row items-center gap-x-[3px]">
                <Ionicons
                  name="arrow-undo"
                  size={16}
                  color={SEMANTIC_COLORS.label.alternative}
                />
                <Text className="text-label font-medium text-label-alternative">
                  {`${getCommunityAuthorName(replyTargetComment.author.name)}님에게 답글`}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="답글 작성 취소"
                hitSlop={8}
                onPress={() => setReplyTarget(null)}
              >
                <Text className="text-label font-medium text-line-normal underline">
                  취소
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View
          className="px-8 pt-2"
          style={{
            paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 20),
          }}
        >
          <View
            className="h-[51px] flex-row items-center rounded-component bg-fill-neutral px-3"
            style={{
              shadowColor: "#000000",
              shadowOpacity: 0.1,
              shadowRadius: 3.4,
              shadowOffset: { width: 0, height: 0 },
              elevation: 2,
            }}
          >
            <TextInput
              ref={commentInputRef}
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={submitMessage}
              maxLength={1000}
              editable={!commentMutation.isPending}
              placeholder={
                replyTarget ? "답글을 입력해주세요." : "댓글을 입력해주세요."
              }
              placeholderTextColor={SEMANTIC_COLORS.line.normal}
              returnKeyType="send"
              className="flex-1 text-body font-medium text-label-normal"
            />
            <Pressable
              accessibilityLabel="댓글 보내기"
              accessibilityState={{ disabled: !message.trim() }}
              hitSlop={8}
              disabled={!message.trim() || commentMutation.isPending}
              onPress={submitMessage}
              className="h-10 w-10 items-center justify-center"
            >
              {commentMutation.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={24}
                  color={
                    message.trim()
                      ? SEMANTIC_COLORS.primary.normal
                      : SEMANTIC_COLORS.label.disabled
                  }
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <DeleteCommunityCommentModal
        visible={Boolean(deleteTarget)}
        isDeleting={deleteCommentMutation.isPending}
        errorMessage={deleteModalError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteModalError(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteCommentMutation.mutate(deleteTarget);
        }}
      />

      <DeleteCommunityPostModal
        visible={deletePostModalVisible}
        isDeleting={deletePostMutation.isPending}
        errorMessage={deletePostError}
        onCancel={() => {
          setDeletePostModalVisible(false);
          setDeletePostError(null);
        }}
        onConfirm={() => deletePostMutation.mutate()}
      />
    </SafeAreaView>
  );
}
