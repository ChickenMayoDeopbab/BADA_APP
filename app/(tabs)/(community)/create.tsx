import CommunityAttachmentCard from "@/components/community/CommunityAttachmentCard";
import CommunityHeader from "@/components/community/CommunityHeader";
import CustomButton from "@/components/common/CustomButton";
import { COMMUNITY_DUMMY_FILE } from "@/constants/community";
import { useCommunity } from "@/context/CommunityContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  const {
    draft,
    updateDraft,
    addDraftAttachment,
    removeDraftAttachment,
    publishDraft,
  } = useCommunity();
  const [menuVisible, setMenuVisible] = useState(false);

  const publish = () => {
    const post = publishDraft();
    if (!post) {
      Alert.alert("게시물을 확인해주세요", "제목과 본문을 모두 입력해주세요.");
      return;
    }
    router.replace({
      pathname: "/(tabs)/(community)/post/[id]",
      params: { id: post.id },
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
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
            value={draft.title}
            onChangeText={(title) => updateDraft({ title })}
            placeholder="게시물 제목을 입력해주세요."
            placeholderTextColor={SEMANTIC_COLORS.line.normal}
            className="h-12 rounded-component bg-background-alternative px-3 text-body font-medium text-label-normal"
          />

          <TextInput
            value={draft.body}
            onChangeText={(body) => updateDraft({ body })}
            placeholder="게시물 본문을 입력해주세요."
            placeholderTextColor={SEMANTIC_COLORS.line.normal}
            multiline
            textAlignVertical="top"
            className="mt-3 min-h-[275px] rounded-component bg-background-alternative px-3 py-3 text-body font-medium text-label-normal"
          />

          <View className="relative z-20 mt-3.5 flex-row items-center justify-between">
            <Text className="text-label text-label-alternative">첨부요소</Text>
            <Pressable
              onPress={() => setMenuVisible((visible) => !visible)}
              className="h-9 flex-row items-center gap-x-1 rounded-component border border-line-alternative bg-background-normal px-3 active:bg-fill-pressed"
            >
              <Text className="text-label text-label-normal">추가하기</Text>
              <Ionicons
                name="add"
                size={20}
                color={SEMANTIC_COLORS.label.normal}
              />
            </Pressable>

            {menuVisible && (
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
                    addDraftAttachment(COMMUNITY_DUMMY_FILE);
                    setMenuVisible(false);
                  }}
                  className="h-10 justify-center px-3 active:bg-fill-pressed"
                >
                  <Text className="text-body font-medium text-label-normal">파일</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMenuVisible(false);
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
                    setMenuVisible(false);
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

          <View className="mt-1.5 min-h-20 justify-center rounded-component bg-fill-normal px-1 py-1.5">
            {draft.attachments.length === 0 ? (
              <Text className="text-center text-caption text-line-normal">
                아직 추가한 요소가 없어요.
              </Text>
            ) : (
              draft.attachments.map((attachment) => (
                <CommunityAttachmentCard
                  key={attachment.id}
                  compact
                  attachment={attachment}
                  onRemove={() => removeDraftAttachment(attachment.id)}
                />
              ))
            )}
          </View>
        </ScrollView>

        <View className="px-[33px] pb-4 pt-2">
          <CustomButton label="등록하기" tone="primary" onPress={publish} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
