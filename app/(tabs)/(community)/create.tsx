import { postCommunityPost } from "@/api/communityApi";
import { getApiErrorMessage } from "@/api/error";
import CommunityHeader from "@/components/community/CommunityHeader";
import CustomButton from "@/components/common/CustomButton";
import { SEMANTIC_COLORS } from "@/design-system";
import { communityQueryKeys } from "@/hooks/useCommunityPosts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateCommunityPostScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const createPostMutation = useMutation({
    mutationFn: postCommunityPost,
    onSuccess: (post) => {
      queryClient.setQueryData(
        communityQueryKeys.post(post.post_id),
        post,
      );
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
      router.replace({
        pathname: "/(tabs)/(community)/post/[id]",
        params: { id: String(post.post_id) },
      });
    },
    onError: (error) => {
      Alert.alert(
        "게시물을 등록하지 못했어요",
        getApiErrorMessage(error, "잠시 후 다시 시도해주세요."),
      );
    },
  });

  const publish = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      Alert.alert("게시물을 확인해주세요", "제목과 본문을 모두 입력해주세요.");
      return;
    }

    createPostMutation.mutate({
      title: trimmedTitle,
      content: trimmedContent,
    });
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-background-normal"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <CommunityHeader title="새 게시물 작성" />

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 33, paddingBottom: 18 }}
        >
          <Text className="mb-1.5 text-label text-label-alternative">
            게시물 제목
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="게시물 제목을 입력해주세요."
            placeholderTextColor={SEMANTIC_COLORS.line.normal}
            className="h-12 rounded-component bg-background-alternative px-3 text-body font-medium text-label-normal"
          />

          <TextInput
            value={content}
            onChangeText={setContent}
            maxLength={5000}
            placeholder="게시물 본문을 입력해주세요."
            placeholderTextColor={SEMANTIC_COLORS.line.normal}
            multiline
            textAlignVertical="top"
            className="mt-3 min-h-[275px] rounded-component bg-background-alternative px-3 py-3 text-body font-medium text-label-normal"
          />

          <Text className="mt-2 text-right text-caption text-label-alternative">
            {content.length}/5000
          </Text>

          <View className="relative z-20 mt-4 flex-row items-center justify-between">
            <Text className="text-label text-label-alternative">첨부요소</Text>
            <Pressable
              onPress={() =>
                setAttachmentMenuVisible((visible) => !visible)
              }
              className="h-9 flex-row items-center gap-x-1 rounded-component border border-line-alternative bg-background-normal px-3 active:bg-fill-pressed"
            >
              <Text className="text-label text-label-normal">추가하기</Text>
              <Ionicons
                name="add"
                size={20}
                color={SEMANTIC_COLORS.label.normal}
              />
            </Pressable>

            {attachmentMenuVisible && (
              <View
                className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-component bg-background-normal"
                style={{
                  shadowColor: "#000000",
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 5,
                }}
              >
                <Pressable
                  onPress={() => {
                    setAttachmentMenuVisible(false);
                    Alert.alert(
                      "파일 첨부 준비 중",
                      "파일 업로드 API가 연결되면 사용할 수 있어요.",
                    );
                  }}
                  className="h-10 justify-center px-3 active:bg-fill-pressed"
                >
                  <Text className="text-body font-medium text-label-normal">
                    파일
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAttachmentMenuVisible(false);
                    router.push("/(tabs)/(community)/attach-scenario");
                  }}
                  className="h-10 justify-center bg-fill-normal px-3 active:bg-fill-pressed"
                >
                  <Text className="text-body font-medium text-label-normal">
                    내 커스텀 시나리오
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAttachmentMenuVisible(false);
                    router.push("/(tabs)/(community)/attach-record");
                  }}
                  className="h-10 justify-center px-3 active:bg-fill-pressed"
                >
                  <Text className="text-body font-medium text-label-normal">
                    내 훈련기록
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="mt-1.5 min-h-20 items-center justify-center rounded-component bg-fill-normal px-4 py-3">
            <Ionicons
              name="attach-outline"
              size={20}
              color={SEMANTIC_COLORS.line.normal}
            />
            <Text className="mt-1 text-center text-caption text-line-normal">
              첨부 기능을 준비하고 있어요.
            </Text>
          </View>
        </ScrollView>

        <View className="px-[33px] pb-6 pt-3">
          <CustomButton
            label={createPostMutation.isPending ? "등록 중..." : "등록하기"}
            tone="primary"
            disabled={createPostMutation.isPending}
            onPress={publish}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
