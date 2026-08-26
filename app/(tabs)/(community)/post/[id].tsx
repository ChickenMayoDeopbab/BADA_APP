import CommunityAttachmentCard from "@/components/community/CommunityAttachmentCard";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import CommunityHeader from "@/components/community/CommunityHeader";
import ReactionPill from "@/components/community/ReactionPill";
import { useCommunity } from "@/context/CommunityContext";
import { SEMANTIC_COLORS } from "@/design-system";
import type {
  CommunityComment,
  CommunityReactionKey,
  CommunityReactions,
} from "@/types/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunityPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts } = useCommunity();
  const post = useMemo(() => posts.find((item) => item.id === id), [id, posts]);
  const [selectedReactions, setSelectedReactions] = useState<
    Set<CommunityReactionKey>
  >(new Set());
  const [comments, setComments] = useState<CommunityComment[]>(
    () => post?.comments ?? [],
  );
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!post) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
        <CommunityHeader title="게시물" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-body text-label-alternative">
            게시물을 찾을 수 없어요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const reactionCounts: CommunityReactions = {
    cheer: post.reactions.cheer + (selectedReactions.has("cheer") ? 1 : 0),
    empathy:
      post.reactions.empathy + (selectedReactions.has("empathy") ? 1 : 0),
    like: post.reactions.like + (selectedReactions.has("like") ? 1 : 0),
  };

  const commentCount = comments.reduce(
    (count, comment) => count + 1 + comment.replies.length,
    0,
  );

  const toggleReaction = (reaction: CommunityReactionKey) => {
    setSelectedReactions((current) => {
      const next = new Set(current);
      if (next.has(reaction)) next.delete(reaction);
      else next.add(reaction);
      return next;
    });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const submitMessage = () => {
    const body = message.trim();
    if (!body) return;

    if (replyTarget) {
      setComments((current) =>
        current.map((comment) =>
          comment.id === replyTarget
            ? {
                ...comment,
                replies: [
                  ...comment.replies,
                  {
                    id: `reply-local-${Date.now()}`,
                    author: post.author,
                    body,
                    createdAt: "방금 전",
                  },
                ],
              }
            : comment,
        ),
      );
      setExpandedReplies((current) => new Set(current).add(replyTarget));
    } else {
      setComments((current) => [
        ...current,
        {
          id: `comment-local-${Date.now()}`,
          author: post.author,
          body,
          createdAt: "방금 전",
          replies: [],
        },
      ]);
    }

    setMessage("");
    setReplyTarget(null);
  };

  const replyTargetComment = comments.find(
    (comment) => comment.id === replyTarget,
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
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
          <Text className="text-title2 font-bold text-label-normal">
            {post.title}
          </Text>

          <View className="mt-1.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-1.5">
              <CommunityAvatar author={post.author} size={22} />
              <Text className="text-body text-label-alternative">
                {post.author.handle}
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
                  {post.viewCount}
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
                {post.createdAt}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-body text-label-normal">{post.body}</Text>

          {post.attachments.length > 0 && (
            <View className="mt-5 gap-y-1.5">
              {post.attachments.map((attachment) => (
                <CommunityAttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                />
              ))}
            </View>
          )}

          <View className="mt-5 flex-row justify-end gap-x-1">
            {(["cheer", "empathy", "like"] as const).map((reaction) => (
              <ReactionPill
                key={reaction}
                type={reaction}
                count={reactionCounts[reaction]}
                selected={selectedReactions.has(reaction)}
                onPress={() => toggleReaction(reaction)}
              />
            ))}
          </View>

          <View className="mt-9 flex-row items-center gap-x-2">
            <Text className="text-headline2 font-bold text-label-neutral">
              댓글
            </Text>
            <Text className="text-body text-label-neutral">{commentCount}</Text>
          </View>

          <View className="mt-3 gap-y-4">
            {comments.map((comment) => {
              const repliesVisible = expandedReplies.has(comment.id);
              return (
                <View key={comment.id}>
                  <Pressable
                    onPress={() => setReplyTarget(comment.id)}
                    className="flex-row items-start gap-x-1.5"
                  >
                    <CommunityAvatar author={comment.author} size={22} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-x-1">
                        <Text className="text-label text-label-alternative">
                          {comment.author.handle}
                        </Text>
                        <Text className="text-label text-label-alternative">·</Text>
                        <Text className="text-label text-label-alternative">
                          {comment.createdAt}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-body text-label-normal">
                        {comment.body}
                      </Text>
                    </View>
                  </Pressable>

                  {repliesVisible &&
                    comment.replies.map((reply) => (
                      <View
                        key={reply.id}
                        className="ml-7 mt-3 flex-row items-start gap-x-1.5"
                      >
                        <CommunityAvatar author={reply.author} size={22} />
                        <View className="flex-1">
                          <View className="flex-row items-center gap-x-1">
                            <Text className="text-label text-label-alternative">
                              {reply.author.handle}
                            </Text>
                            <Text className="text-label text-label-alternative">·</Text>
                            <Text className="text-label text-label-alternative">
                              {reply.createdAt}
                            </Text>
                          </View>
                          <Text className="mt-0.5 text-body text-label-normal">
                            {reply.body}
                          </Text>
                        </View>
                      </View>
                    ))}

                  {comment.replies.length > 0 && (
                    <Pressable
                      onPress={() => toggleReplies(comment.id)}
                      className="mt-2 self-end py-1"
                    >
                      <Text className="text-label text-label-alternative">
                        {repliesVisible
                          ? "답글 가리기"
                          : `답글 ${comment.replies.length}개 보기`}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {replyTargetComment && (
          <View className="flex-row items-center justify-between px-8 pb-1">
            <Text className="text-caption text-label-alternative">
              ↪ {replyTargetComment.author.handle.replace("@", "")}님에게 답글
            </Text>
            <Pressable onPress={() => setReplyTarget(null)}>
              <Text className="text-caption text-label-alternative">취소</Text>
            </Pressable>
          </View>
        )}

        <View className="px-8 pb-3 pt-1">
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
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={submitMessage}
              placeholder={replyTarget ? "답글을 입력해주세요." : "댓글을 입력해주세요."}
              placeholderTextColor={SEMANTIC_COLORS.line.normal}
              returnKeyType="send"
              className="flex-1 text-body font-medium text-label-normal"
            />
            <Pressable
              accessibilityLabel="댓글 보내기"
              hitSlop={8}
              disabled={!message.trim()}
              onPress={submitMessage}
              className="h-10 w-10 items-center justify-center"
            >
              <Ionicons
                name="send"
                size={24}
                color={
                  message.trim()
                    ? SEMANTIC_COLORS.primary.normal
                    : SEMANTIC_COLORS.label.disabled
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
