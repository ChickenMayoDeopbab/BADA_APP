import { postCommunityPost } from "@/api/communityApi";
import { getApiErrorMessage } from "@/api/error";
import CustomButton from "@/components/common/CustomButton";
import CommunityHeader from "@/components/community/CommunityHeader";
import PhotoLibrarySheet from "@/components/profile/PhotoLibrarySheet";
import { useCommunityPostDraft } from "@/context/CommunityPostDraftContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { communityQueryKeys } from "@/hooks/useCommunityPosts";
import { formatCommunityTimestamp } from "@/utils/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialDesignIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

export default function CreateCommunityPostScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    selectedScenario,
    clearScenario,
    selectedTrainingRecord,
    clearTrainingRecord,
    selectedPhotoUri,
    selectPhoto,
    clearPhoto,
  } = useCommunityPostDraft();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [photoLibraryVisible, setPhotoLibraryVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  useEffect(() => {
    clearScenario();
    clearTrainingRecord();
    clearPhoto();
  }, [clearPhoto, clearScenario, clearTrainingRecord]);

  const createPostMutation = useMutation({
    mutationFn: postCommunityPost,
    onSuccess: (post) => {
      clearScenario();
      clearTrainingRecord();
      clearPhoto();
      queryClient.setQueryData(communityQueryKeys.post(post.post_id), post);
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

  const submitPost = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      Alert.alert("게시물을 확인해주세요", "제목과 본문을 모두 입력해주세요.");
      return;
    }

    const attachments = [
      ...(selectedScenario
        ? [{ kind: "SCENARIO" as const, ref_id: selectedScenario.scenario_id }]
        : []),
      ...(selectedTrainingRecord
        ? [
            {
              kind: "TRAINING_RECORD" as const,
              ref_id: selectedTrainingRecord.recordId,
            },
          ]
        : []),
    ];

    createPostMutation.mutate({
      title: trimmedTitle,
      content: trimmedContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const publish = () => {
    if (!selectedPhotoUri) {
      submitPost();
      return;
    }

    Alert.alert(
      "사진 첨부 API가 아직 없어요",
      "선택한 사진을 제외하고 게시물을 등록할까요?",
      [
        { text: "취소", style: "cancel" },
        { text: "사진 제외하고 등록", onPress: submitPost },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <CommunityHeader title="새 게시물 작성" />

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 33,
            paddingTop: 16,
            paddingBottom: 18,
          }}
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
            className="h-12 px-3 font-medium rounded-component bg-background-alternative text-body text-label-normal"
          />
          <TextInput
            value={content}
            onChangeText={setContent}
            maxLength={1000}
            placeholder="게시물 본문을 입력해주세요."
            placeholderTextColor={SEMANTIC_COLORS.line.normal}
            multiline
            textAlignVertical="top"
            className="mt-3 min-h-[275px] rounded-component bg-background-alternative px-3 py-3 text-body font-medium text-label-normal"
          />
          <Text className="mt-2 text-right text-caption text-label-alternative">
            {content.length}/1000
          </Text>
          <View className="relative z-20 flex-row items-center justify-between mt-4">
            <Text className="text-label text-label-alternative">첨부요소</Text>
            <Pressable
              onPress={() => setAttachmentMenuVisible((visible) => !visible)}
              className="flex-row items-center px-3 border h-9 gap-x-1 rounded-component border-line-alternative bg-background-normal active:bg-fill-pressed"
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
                className="absolute right-0 z-30 overflow-hidden top-10 w-44 rounded-component bg-background-normal"
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
                    setPhotoLibraryVisible(true);
                  }}
                  className="justify-center h-10 px-3 active:bg-fill-pressed"
                >
                  <Text className="font-medium text-body text-label-normal">
                    파일
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAttachmentMenuVisible(false);
                    router.push("/(tabs)/(community)/attach-scenario");
                  }}
                  className="justify-center h-10 px-3 active:bg-fill-pressed"
                >
                  <Text className="font-medium text-body text-label-normal">
                    내 커스텀 시나리오
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAttachmentMenuVisible(false);
                    router.push("/(tabs)/(community)/attach-record");
                  }}
                  className="justify-center h-10 px-3 active:bg-fill-pressed"
                >
                  <Text className="font-medium text-body text-label-normal">
                    내 훈련기록
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <View className="mt-1.5 rounded-component bg-background-alternative px-4 py-1">
            {selectedScenario && (
              <View className="flex-row items-center justify-between border-line-alternative py-2.5">
                <View className="flex-1 flex-row items-center gap-x-1.5">
                  <MaterialDesignIcons
                    name="movie"
                    size={16}
                    color={SEMANTIC_COLORS.label.alternative}
                  />
                  <Text className="text-label text-label-alternative">
                    커스텀 시나리오
                  </Text>
                </View>
                <View className="flex-row items-center gap-x-2">
                  <Text
                    numberOfLines={1}
                    className="max-w-[180px] text-label font-medium text-label-normal"
                  >
                    {selectedScenario.title}
                  </Text>
                  <Pressable
                    accessibilityLabel="첨부 시나리오 삭제"
                    hitSlop={8}
                    onPress={clearScenario}
                    className="p-1 active:opacity-60"
                  >
                    <MaterialDesignIcons
                      name="trash-can"
                      size={24}
                      color={SEMANTIC_COLORS.line.normal}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {selectedPhotoUri && (
              <View className="flex-row items-center justify-between border-line-alternative py-2.5">
                <View className="flex-1 flex-row items-center gap-x-1.5">
                  <MaterialDesignIcons
                    name="file"
                    size={16}
                    color={SEMANTIC_COLORS.label.alternative}
                  />
                  <Text className="text-label text-label-alternative">
                    파일
                  </Text>
                </View>
                <View className="flex-row items-center gap-x-2">
                  <Text
                    numberOfLines={1}
                    className="max-w-[180px] text-label font-medium text-label-normal"
                  >
                    {selectedPhotoUri.split("/").pop() ?? "사진"}
                  </Text>
                  <Pressable
                    accessibilityLabel="첨부 사진 삭제"
                    hitSlop={8}
                    onPress={clearPhoto}
                    className="p-1 active:opacity-60"
                  >
                    <MaterialDesignIcons
                      name="trash-can"
                      size={24}
                      color={SEMANTIC_COLORS.line.normal}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {selectedTrainingRecord && (
              <View className="flex-row items-center justify-between border-line-alternative py-2.5">
                <View className="flex-1 flex-row items-center gap-x-1.5">
                  <Octicons
                    name="history"
                    size={16}
                    color={SEMANTIC_COLORS.label.alternative}
                  />
                  <Text className="text-label text-label-alternative">
                    훈련 기록
                  </Text>
                </View>
                <View className="flex-row items-center gap-x-2">
                  <Text
                    numberOfLines={1}
                    className="max-w-[180px] text-label font-medium text-label-normal"
                  >
                    {`${selectedTrainingRecord.scenarioName} (${formatCommunityTimestamp(
                      selectedTrainingRecord.trainedAt,
                    )})`}
                  </Text>
                  <Pressable
                    accessibilityLabel="첨부 훈련 기록 삭제"
                    hitSlop={8}
                    onPress={clearTrainingRecord}
                    className="p-1 active:opacity-60"
                  >
                    <MaterialDesignIcons
                      name="trash-can"
                      size={24}
                      color={SEMANTIC_COLORS.line.normal}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {!selectedPhotoUri &&
              !selectedScenario &&
              !selectedTrainingRecord && (
                <View className="items-center justify-center px-4 py-3 min-h-20 rounded-component bg-fill-normal">
                  <Ionicons
                    name="attach-outline"
                    size={20}
                    color={SEMANTIC_COLORS.line.normal}
                  />
                  <Text className="mt-1 text-center text-caption text-line-normal">
                    추가하기에서 공유할 요소를 선택할 수 있어요.
                  </Text>
                </View>
              )}
          </View>
        </ScrollView>

        <View
          className="px-[33px] pt-3"
          style={{
            paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 24),
          }}
        >
          <CustomButton
            label={createPostMutation.isPending ? "등록 중..." : "등록하기"}
            tone="primary"
            disabled={createPostMutation.isPending}
            onPress={publish}
          />
        </View>
      </KeyboardAvoidingView>

      <PhotoLibrarySheet
        visible={photoLibraryVisible}
        onClose={() => setPhotoLibraryVisible(false)}
        onSelect={selectPhoto}
      />
    </SafeAreaView>
  );
}
