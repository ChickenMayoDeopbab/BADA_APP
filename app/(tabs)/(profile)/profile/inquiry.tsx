import { getApiErrorMessage } from "@/api/error";
import { sendInquiry } from "@/api/supportApi";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { SEMANTIC_COLORS } from "@/design-system";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** 문의와 피드백을 접수하고 전송 실패 시 작성 내용을 보존한다. */
export default function InquiryScreen() {
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardVisible();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const isSendingRef = useRef(false);
  const mutation = useMutation({ mutationFn: sendInquiry, retry: false });
  const canSubmit =
    title.trim().length > 0 &&
    title.trim().length <= 100 &&
    content.trim().length > 0 &&
    content.trim().length <= 3000;

  /** 유효한 문의를 한 번만 전송한다. */
  const handleSubmit = async () => {
    if (!canSubmit || isSendingRef.current || mutation.isSuccess) return;
    isSendingRef.current = true;
    Keyboard.dismiss();
    try {
      await mutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
      });
    } catch {
      // 오류 메시지는 mutation 상태로 표시하고 입력 내용은 유지한다.
    } finally {
      isSendingRef.current = false;
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <Top title="문의 및 피드백" back safeArea={false} />
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-[33px] pt-4 pb-[18px]"
        >
          {mutation.isSuccess ? (
            <View className="gap-5">
              <Text
                accessibilityRole="header"
                className="text-title2 font-bold text-label-normal"
              >
                문의를 접수했어요.
              </Text>
              <Text className="text-body text-label-alternative">
                보내주신 문의와 피드백을 확인하겠습니다.
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-5 text-body text-label-alternative">
                불편한 점이나 개선 의견을 알려 주세요. 비밀번호 등 민감한 정보는
                입력하지 마세요.
              </Text>
              <Text className="mb-1.5 text-label text-label-alternative">
                문의 제목
              </Text>
              <TextInput
                accessibilityLabel="문의 제목"
                value={title}
                onChangeText={setTitle}
                placeholder="문의 제목을 입력해주세요."
                placeholderTextColor={SEMANTIC_COLORS.line.normal}
                className="h-14 px-3 font-medium rounded-component bg-background-alternative text-body text-label-normal"
                maxLength={100}
                editable={!mutation.isPending}
              />
              <Text className="mt-6 mb-1.5 text-label text-label-alternative">
                문의 본문
              </Text>
              <TextInput
                accessibilityLabel="문의 본문"
                value={content}
                onChangeText={setContent}
                placeholder="문의 및 피드백 내용을 입력해주세요."
                placeholderTextColor={SEMANTIC_COLORS.line.normal}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                className="min-h-[275px] rounded-component bg-background-alternative px-3 py-3 text-body font-medium text-label-normal"
                maxLength={3000}
                editable={!mutation.isPending}
              />
              <Text className="mt-2 text-right text-caption text-label-alternative">
                {content.length}/3000
              </Text>
              {mutation.isError ? (
                <Text
                  accessibilityRole="alert"
                  className="mt-4 text-body text-status-error"
                >
                  {getApiErrorMessage(
                    mutation.error,
                    "문의를 전송하지 못했어요. 잠시 후 다시 시도해 주세요.",
                  )}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
        <View
          className="px-[33px] pt-3"
          style={{
            paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 24),
          }}
        >
          <CustomButton
            label={
              mutation.isSuccess
                ? "마이페이지로 돌아가기"
                : mutation.isPending
                  ? "전송 중"
                  : "보내기"
            }
            tone="primary"
            disabled={!mutation.isSuccess && (!canSubmit || mutation.isPending)}
            onPress={() =>
              mutation.isSuccess ? router.back() : void handleSubmit()
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
