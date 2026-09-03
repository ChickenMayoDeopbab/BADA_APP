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
import CommunityPostAttachments from "@/components/community/CommunityPostAttachments";
import ReactionPill from "@/components/community/ReactionPill";
import { SEMANTIC_COLORS } from "@/design-system";
import {
  communityQueryKeys,
  useCommunityComments,
  useCommunityPost,
} from "@/hooks/useCommunityPosts";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
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
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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

interface CommentActionMenuProps {
  visible: boolean;
  editLabel: string;
  deleteLabel: string;
  editDisabled: boolean;
  deleteDisabled: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CommentActionMenu({
  visible,
  editLabel,
  deleteLabel,
  editDisabled,
  deleteDisabled,
  onToggle,
  onEdit,
  onDelete,
}: CommentActionMenuProps) {
  return (
    <View className="relative ml-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${editLabel.replace("하기", "")} 및 삭제 메뉴`}
        accessibilityState={{ expanded: visible }}
        hitSlop={6}
        onPress={onToggle}
        className="h-7 w-7 items-center justify-center rounded-full active:bg-fill-neutral"
      >
        <Ionicons
          name="ellipsis-vertical"
          size={19}
          color={SEMANTIC_COLORS.label.alternative}
        />
      </Pressable>

      {visible && (
        <View
          className="absolute right-0 top-8 z-50 h-[104px] w-40 overflow-hidden rounded-component bg-background-normal"
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
            accessibilityLabel={editLabel}
            disabled={editDisabled}
            onPress={onEdit}
            className="h-[52px] justify-center px-3 active:bg-fill-neutral"
          >
            <Text className="text-headline2 font-medium text-label-normal">
              {editLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
            disabled={deleteDisabled}
            onPress={onDelete}
            className="h-[52px] justify-center px-3 active:bg-fill-neutral"
          >
            <Text className="text-headline2 font-medium text-label-normal">
              {deleteLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

interface CommentEditorProps {
  value: string;
  errorMessage: string | null;
  isSaving: boolean;
  onChangeText: (value: string) => void;
}

function CommentEditor({
  value,
  errorMessage,
  isSaving,
  onChangeText,
}: CommentEditorProps) {
  return (
    <View className="mt-1 gap-y-1">
      <View className="rounded-component border border-primary-normal bg-background-normal px-2.5 py-2">
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChangeText}
          maxLength={1000}
          multiline
          submitBehavior="newline"
          textAlignVertical="top"
          editable={!isSaving}
          underlineColorAndroid="transparent"
          selectionColor={SEMANTIC_COLORS.primary.normal}
          placeholder="댓글 내용을 입력해주세요."
          placeholderTextColor={SEMANTIC_COLORS.line.normal}
          className="w-full text-body text-label-normal"
          style={{
            minHeight: 52,
            maxHeight: 140,
            margin: 0,
            padding: 0,
            includeFontPadding: false,
          }}
        />
        <Text className="mt-1 text-right text-caption text-label-alternative">
          {value.length}/1000
        </Text>
      </View>
      {errorMessage && (
        <Text className="text-caption text-status-error">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

interface InlineEditButtonsProps {
  isSaving: boolean;
  saveDisabled: boolean;
  onCancel: () => void;
  onSave: () => void;
}

function InlineEditButtons({
  isSaving,
  saveDisabled,
  onCancel,
  onSave,
}: InlineEditButtonsProps) {
  return (
    <View className="ml-2 flex-row items-center gap-x-1">
      <View className="w-[44px]">
        <CustomButton
          label="취소"
          variant="sm"
          tone="neutral"
          disabled={isSaving}
          onPress={onCancel}
        />
      </View>
      <View className="w-[44px]">
        <CustomButton
          label="저장"
          variant="sm"
          tone="primary"
          disabled={saveDisabled || isSaving}
          onPress={onSave}
        />
      </View>
    </View>
  );
}

export default function CommunityPostDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string | string[];
    source?: string | string[];
  }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const postId = Number(rawId);
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const handleBack = () => {
    if (source === "notifications") {
      router.navigate("/(tabs)/(home)/notifications");
      return;
    }

    router.back();
  };
  useAndroidBackHandler(() => {
    if (source !== "notifications") return false;

    router.navigate("/(tabs)/(home)/notifications");
    return true;
  });
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
  const [focusedPostField, setFocusedPostField] = useState<
    "title" | "content" | null
  >(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [editCommentError, setEditCommentError] = useState<string | null>(null);
  const [commentMenuTargetId, setCommentMenuTargetId] = useState<
    number | null
  >(null);
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
  const postContentInputRef = useRef<TextInput>(null);
  const commentRefreshRotation = useRef(new Animated.Value(0)).current;

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
      setFocusedPostField(null);
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
    setFocusedPostField("title");
    setInteractionError(null);
  };

  const cancelEditingPost = () => {
    if (updatePostMutation.isPending) return;
    setEditingPost(false);
    setFocusedPostField(null);
    setInteractionError(null);
  };

  const savePost = () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content || updatePostMutation.isPending) return;
    updatePostMutation.mutate({ title, content });
  };

  const startEditingComment = (commentId: number, content: string) => {
    setCommentMenuTargetId(null);
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
    setCommentMenuTargetId(null);
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

  const refreshComments = () => {
    if (commentsQuery.isFetching) return;

    commentRefreshRotation.setValue(0);
    Animated.timing(commentRefreshRotation, {
      toValue: 1,
      duration: 650,
      easing: Easing.bezier(0.22, 0.78, 0.28, 1),
      useNativeDriver: true,
    }).start();
    void commentsQuery.refetch();
  };

  const commentRefreshSpin = commentRefreshRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const commentRefreshScale = commentRefreshRotation.interpolate({
    inputRange: [0, 0.4, 0.72, 1],
    outputRange: [1, 0.88, 1.04, 1],
  });

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
        <CommunityHeader title="게시물" onBack={handleBack} />
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
        <CommunityHeader title="게시물" onBack={handleBack} />
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
        <CommunityHeader title="게시물" onBack={handleBack} />
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
    <View className="mt-2.5 flex-row items-center justify-between">
      <View className="flex-row items-center gap-x-1.5">
        <CommunityAvatar author={post.author} size={20} />
        <Text
          className="text-label text-label-alternative"
          style={{ includeFontPadding: false, lineHeight: 18 }}
        >
          {getCommunityAuthorName(post.author.name)}
        </Text>
      </View>
      {!editingPost ? (
        <View className="h-5 flex-row items-center gap-x-2.5">
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="eye"
              size={18}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text
              className="text-label text-label-alternative"
              style={{ includeFontPadding: false, lineHeight: 18 }}
            >
              {post.view_count}
            </Text>
          </View>
          <View className="flex-row items-center gap-x-[3px]">
            <Ionicons
              name="chatbubble"
              size={18}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text
              className="text-label text-label-alternative"
              style={{ includeFontPadding: false, lineHeight: 18 }}
            >
              {commentCount}
            </Text>
          </View>
          <Text
            className="text-label text-label-alternative"
            style={{ includeFontPadding: false, lineHeight: 18 }}
          >
            {formatCommunityTimestamp(post.created_at)}
          </Text>
        </View>
      ) : null}
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
            onBack={handleBack}
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
          onScrollBeginDrag={() => setCommentMenuTargetId(null)}
          contentContainerStyle={{
            paddingHorizontal: 33,
            paddingTop: 16,
            paddingBottom: 18,
          }}
        >
          {editingPost ? (
            <View className="gap-y-4">
              <View className="gap-y-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-label font-medium text-label-alternative">
                    게시물 제목
                  </Text>
                  <Text className="text-caption text-label-alternative">
                    {editTitle.length}/100
                  </Text>
                </View>
                <View
                  className={`h-12 justify-center rounded-component border bg-background-normal px-3 ${
                    focusedPostField === "title"
                      ? "border-primary-normal"
                      : "border-line-alternative"
                  }`}
                >
                  <TextInput
                    autoFocus
                    value={editTitle}
                    onChangeText={(value) =>
                      setEditTitle(value.replace(/[\r\n]+/g, " "))
                    }
                    onFocus={() => setFocusedPostField("title")}
                    onBlur={() => setFocusedPostField(null)}
                    maxLength={100}
                    multiline={false}
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      postContentInputRef.current?.focus()
                    }
                    editable={!updatePostMutation.isPending}
                    underlineColorAndroid="transparent"
                    selectionColor={SEMANTIC_COLORS.primary.normal}
                    placeholder="게시물 제목을 입력해주세요."
                    placeholderTextColor={SEMANTIC_COLORS.line.normal}
                    className="w-full text-headline2 font-bold text-label-normal"
                    style={{
                      margin: 0,
                      padding: 0,
                      includeFontPadding: false,
                    }}
                  />
                </View>
              </View>

              {postMetadata}

              <View className="gap-y-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-label font-medium text-label-alternative">
                    게시물 본문
                  </Text>
                  <Text className="text-caption text-label-alternative">
                    {editContent.length}/5000
                  </Text>
                </View>
                <View
                  className={`rounded-component border bg-background-normal px-3 py-3 ${
                    focusedPostField === "content"
                      ? "border-primary-normal"
                      : "border-line-alternative"
                  }`}
                >
                  <TextInput
                    ref={postContentInputRef}
                    value={editContent}
                    onChangeText={setEditContent}
                    onFocus={() => setFocusedPostField("content")}
                    onBlur={() => setFocusedPostField(null)}
                    maxLength={5000}
                    multiline
                    submitBehavior="newline"
                    textAlignVertical="top"
                    editable={!updatePostMutation.isPending}
                    underlineColorAndroid="transparent"
                    selectionColor={SEMANTIC_COLORS.primary.normal}
                    placeholder="게시물 본문을 입력해주세요."
                    placeholderTextColor={SEMANTIC_COLORS.line.normal}
                    className="w-full text-body text-label-normal"
                    style={{
                      minHeight: 160,
                      maxHeight: 260,
                      margin: 0,
                      padding: 0,
                      includeFontPadding: false,
                    }}
                  />
                </View>
              </View>

              {interactionError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-caption text-status-error"
                >
                  {interactionError}
                </Text>
              ) : null}

              <View className="flex-row gap-x-2">
                <View className="min-w-0 flex-1">
                  <CustomButton
                    label="취소하기"
                    variant="md"
                    tone="neutral"
                    disabled={updatePostMutation.isPending}
                    onPress={cancelEditingPost}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <CustomButton
                    label={
                      updatePostMutation.isPending
                        ? "저장 중..."
                        : "수정사항 저장"
                    }
                    variant="md"
                    tone="primary"
                    disabled={
                      updatePostMutation.isPending ||
                      !editTitle.trim() ||
                      !editContent.trim()
                    }
                    onPress={savePost}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-title2 font-bold text-label-normal">
                {post.title}
              </Text>
              {postMetadata}
              <View style={{ minHeight: 80 }}>
                <Text className="mt-5 text-body text-label-normal">
                  {post.content}
                </Text>
                <CommunityPostAttachments
                  postId={postId}
                  attachments={post.attachments}
                />
              </View>
            </View>
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

          {interactionError && !editingPost && (
            <Text className="mt-2 text-right text-caption text-status-error">
              {interactionError}
            </Text>
          )}

          <View className="mt-4 h-px bg-line-alternative" />

          <View className="mt-5 flex-row items-center justify-between">
            <View className="ml-[26px] flex-row items-center gap-x-2">
              <Text className="text-headline2 font-bold text-label-neutral">
                댓글
              </Text>
              <Text className="text-body text-label-neutral">
                {commentCount}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="댓글 새로고침"
              accessibilityState={{ disabled: commentsQuery.isFetching }}
              disabled={commentsQuery.isFetching}
              hitSlop={8}
              onPress={refreshComments}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-fill-neutral"
            >
              <Animated.View
                style={{
                  transform: [
                    { rotate: commentRefreshSpin },
                    { scale: commentRefreshScale },
                  ],
                }}
              >
                <Ionicons
                  name="refresh"
                  size={22}
                  color={SEMANTIC_COLORS.label.alternative}
                />
              </Animated.View>
            </Pressable>
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
                const isEditingComment =
                  editingCommentId === comment.comment_id;
                return (
                  <View
                    key={comment.comment_id}
                    className={
                      commentMenuTargetId === comment.comment_id
                        ? "relative z-20"
                        : "relative z-0"
                    }
                  >
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
                          {isEditingComment ? (
                            <InlineEditButtons
                              isSaving={updateCommentMutation.isPending}
                              saveDisabled={!editCommentContent.trim()}
                              onCancel={cancelEditingComment}
                              onSave={saveComment}
                            />
                          ) : (
                            canEditComment && (
                              <CommentActionMenu
                                visible={
                                  commentMenuTargetId === comment.comment_id
                                }
                                editLabel="댓글 수정하기"
                                deleteLabel="댓글 삭제하기"
                                editDisabled={updateCommentMutation.isPending}
                                deleteDisabled={
                                  deleteCommentMutation.isPending
                                }
                                onToggle={() =>
                                  setCommentMenuTargetId((currentId) =>
                                    currentId === comment.comment_id
                                      ? null
                                      : comment.comment_id,
                                  )
                                }
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
                            )
                          )}
                        </View>

                        {isEditingComment ? (
                          <CommentEditor
                            value={editCommentContent}
                            errorMessage={editCommentError}
                            isSaving={updateCommentMutation.isPending}
                            onChangeText={setEditCommentContent}
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
                        const isEditingReply =
                          editingCommentId === reply.comment_id;

                        return (
                          <View
                            key={reply.comment_id}
                            className={`ml-7 mt-3 flex-row items-start gap-x-1.5 ${
                              commentMenuTargetId === reply.comment_id
                                ? "relative z-20"
                                : "relative z-0"
                            }`}
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
                                {isEditingReply ? (
                                  <InlineEditButtons
                                    isSaving={updateCommentMutation.isPending}
                                    saveDisabled={!editCommentContent.trim()}
                                    onCancel={cancelEditingComment}
                                    onSave={saveComment}
                                  />
                                ) : (
                                  canEditReply && (
                                    <CommentActionMenu
                                      visible={
                                        commentMenuTargetId === reply.comment_id
                                      }
                                      editLabel="답글 수정하기"
                                      deleteLabel="답글 삭제하기"
                                      editDisabled={
                                        updateCommentMutation.isPending
                                      }
                                      deleteDisabled={
                                        deleteCommentMutation.isPending
                                      }
                                      onToggle={() =>
                                        setCommentMenuTargetId((currentId) =>
                                          currentId === reply.comment_id
                                            ? null
                                            : reply.comment_id,
                                        )
                                      }
                                      onEdit={() =>
                                        startEditingComment(
                                          reply.comment_id,
                                          reply.content,
                                        )
                                      }
                                      onDelete={() =>
                                        confirmDeleteComment(
                                          reply.comment_id,
                                          1,
                                        )
                                      }
                                    />
                                  )
                                )}
                              </View>

                              {isEditingReply ? (
                                <CommentEditor
                                  value={editCommentContent}
                                  errorMessage={editCommentError}
                                  isSaving={updateCommentMutation.isPending}
                                  onChangeText={setEditCommentContent}
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
