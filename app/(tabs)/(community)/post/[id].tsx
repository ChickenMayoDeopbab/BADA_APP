import {
  deleteCommunityReaction,
  deleteCommunityComment,
  patchCommunityPost,
  postCommunityComment,
  putCommunityReaction,
} from "@/api/communityApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/api/error";
import type {
  CommunityCommentListResponse,
  CommunityPostDetailResponse,
  CommunityReactionKind,
} from "@/api/types";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import CommunityHeader from "@/components/community/CommunityHeader";
import DeleteCommunityCommentModal from "@/components/community/DeleteCommunityCommentModal";
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
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REACTION_COUNT_KEYS: Record<
  CommunityReactionKind,
  "cheer" | "relate" | "like"
> = {
  CHEER: "cheer",
  RELATE: "relate",
  LIKE: "like",
};

export default function CommunityPostDetailScreen() {
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
  const [deleteTarget, setDeleteTarget] = useState<{
    commentId: number;
    removedCount: number;
  } | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const reactionMutation = useMutation({
    mutationFn: async (kind: CommunityReactionKind) => {
      const currentPost = queryClient.getQueryData<CommunityPostDetailResponse>(
        communityQueryKeys.post(postId),
      );

      if (currentPost?.my_reaction === kind) {
        await deleteCommunityReaction(postId);
        return null;
      }

      return putCommunityReaction(postId, { kind });
    },
    onSuccess: (reactionState, requestedKind) => {
      queryClient.setQueryData<CommunityPostDetailResponse>(
        communityQueryKeys.post(postId),
        (currentPost) => {
          if (!currentPost) return currentPost;

          if (reactionState) {
            return {
              ...currentPost,
              reactions: reactionState.reactions,
              my_reaction: reactionState.my_reaction ?? requestedKind,
            };
          }

          const countKey = REACTION_COUNT_KEYS[requestedKind];
          const currentReactions = currentPost.reactions ?? {};
          return {
            ...currentPost,
            reactions: {
              ...currentReactions,
              [countKey]: Math.max(0, (currentReactions[countKey] ?? 0) - 1),
              total: Math.max(0, (currentReactions.total ?? 0) - 1),
            },
            my_reaction: null,
          };
        },
      );
      setInteractionError(null);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: (error) => {
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
      edges={["top", "bottom"]}
      className="flex-1 bg-background-alternative"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <CommunityHeader title="게시물" />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 33, paddingBottom: 18 }}
        >
          {editingPost ? (
            <>
              <View className="min-h-[310px] rounded-component bg-background-normal px-[18px] py-4">
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={100}
                  editable={!updatePostMutation.isPending}
                  selectionColor={SEMANTIC_COLORS.primary.normal}
                  className="p-0 text-title2 font-bold text-label-normal"
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
                  className="mt-4 min-h-[210px] flex-1 p-0 text-body text-label-normal"
                />
              </View>

              <View className="mt-2 flex-row justify-end gap-x-4 pr-1">
                <Pressable
                  disabled={updatePostMutation.isPending}
                  onPress={() => setEditingPost(false)}
                  hitSlop={10}
                >
                  <Text className="text-caption text-label-alternative underline">
                    취소
                  </Text>
                </Pressable>
                <Pressable
                  disabled={
                    !editTitle.trim() ||
                    !editContent.trim() ||
                    updatePostMutation.isPending
                  }
                  onPress={savePost}
                  hitSlop={10}
                >
                  <Text
                    className={`text-caption underline ${
                      editTitle.trim() && editContent.trim()
                        ? "text-primary-normal"
                        : "text-label-disabled"
                    }`}
                  >
                    {updatePostMutation.isPending ? "저장 중" : "저장"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text className="text-title2 font-bold text-label-normal">
                {post.title}
              </Text>
              {postMetadata}
              <Text className="mt-4 text-body text-label-normal">
                {post.content}
              </Text>
              {isPostAuthor && (
                <View className="mt-2 flex-row justify-end">
                  <Pressable onPress={startEditingPost} hitSlop={8}>
                    <Text className="text-label text-label-alternative underline">
                      수정
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          <View className="mt-5 flex-row justify-end gap-x-1">
            {(["CHEER", "RELATE", "LIKE"] as const).map((reaction) => (
              <ReactionPill
                key={reaction}
                type={reaction}
                count={reactionCounts[REACTION_COUNT_KEYS[reaction]] ?? 0}
                selected={post.my_reaction === reaction}
                loading={reactionMutation.isPending}
                onPress={() => reactionMutation.mutate(reaction)}
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
                const canDeleteComment =
                  isPostAuthor || currentUserId === comment.author.user_id;
                return (
                  <View key={comment.comment_id}>
                    <Pressable
                      onPress={() => selectReplyTarget(comment.comment_id)}
                      className="flex-row items-start gap-x-1.5"
                    >
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
                          {canDeleteComment && (
                            <Pressable
                              accessibilityLabel="댓글 삭제"
                              disabled={deleteCommentMutation.isPending}
                              hitSlop={8}
                              onPress={(event) => {
                                event.stopPropagation();
                                confirmDeleteComment(
                                  comment.comment_id,
                                  1 + replies.length,
                                );
                              }}
                              className="ml-2 p-1 active:opacity-60"
                            >
                              <Ionicons
                                name="trash"
                                size={19}
                                color={SEMANTIC_COLORS.line.normal}
                              />
                            </Pressable>
                          )}
                        </View>
                        <Text className="mt-0.5 text-body text-label-normal">
                          {comment.content}
                        </Text>
                      </View>
                    </Pressable>

                    {repliesVisible &&
                      replies.map((reply) => (
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
                              {(isPostAuthor ||
                                currentUserId === reply.author.user_id) && (
                                <Pressable
                                  accessibilityLabel="답글 삭제"
                                  disabled={deleteCommentMutation.isPending}
                                  hitSlop={8}
                                  onPress={() =>
                                    confirmDeleteComment(reply.comment_id, 1)
                                  }
                                  className="ml-2 p-1 active:opacity-60"
                                >
                                  <Ionicons
                                    name="trash"
                                    size={19}
                                    color={SEMANTIC_COLORS.line.normal}
                                  />
                                </Pressable>
                              )}
                            </View>
                            <Text className="mt-0.5 text-body text-label-normal">
                              {reply.content}
                            </Text>
                          </View>
                        </View>
                      ))}

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
          <View className="flex-row items-center justify-between px-8 pb-1">
            <Text className="text-caption text-label-alternative">
              ↪ {getCommunityAuthorName(replyTargetComment.author.name)}님에게 답글
            </Text>
            <Pressable onPress={() => setReplyTarget(null)}>
              <Text className="text-caption text-label-alternative">취소</Text>
            </Pressable>
          </View>
        )}

        <View className="px-8 pb-5 pt-2">
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
    </SafeAreaView>
  );
}
