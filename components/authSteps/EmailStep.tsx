import { postEmailCheck, postEmailSend } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { authCodeRules, emailRules } from "@/constants/authValidation";
import { RegisterFormValues } from "@/types/auth";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type EmailProps = {
  onPrev: () => void;
  onNext: () => boolean | Promise<boolean>;
  isSent: boolean;
  onSentChange: (isSent: boolean) => void;
  isSubmitting?: boolean;
  submitError?: string;
  onFormChange?: () => void;
};

export default function EmailStep({
  onPrev,
  onNext,
  isSent,
  onSentChange,
  isSubmitting = false,
  submitError = "",
  onFormChange,
}: EmailProps) {
  const { width } = useWindowDimensions();
  const codeButtonWidth = Math.min(Math.max(width * 0.31, 116), 128);

  const {
    control,
    getValues,
    trigger,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<RegisterFormValues>();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const verificationRef = useRef<TextInput>(null);

  const handleEmailSend = async () => {
    const isValid = await trigger("email");
    if (!isValid) return;

    setIsSending(true);
    try {
      const email = getValues("email").trim();
      await postEmailSend({ email, type: "SIGNUP" });
      clearErrors("email");
      onSentChange(true);
      verificationRef.current?.focus();
    } catch (error) {
      onSentChange(false);
      setError("email", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "인증코드 전송에 실패했습니다. 다시 시도해주세요.",
        ),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailCheck = async () => {
    const isValid = await trigger(["email", "authNum"]);
    if (!isValid) return;
    if (!isSent) {
      setError("email", {
        type: "server",
        message: "먼저 인증코드를 전송해주세요.",
      });
      return;
    }

    setIsChecking(true);
    try {
      const email = getValues("email").trim();
      const authNum = getValues("authNum").trim();
      await postEmailCheck({ email, authNum, type: "SIGNUP" });
      clearErrors(["email", "authNum"]);
      await onNext();
    } catch (error) {
      setError("authNum", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "인증코드 확인에 실패했습니다. 다시 시도해주세요.",
        ),
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View>
      <View className="mb-5">
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="email"
              rules={emailRules}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <CustomInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    onSentChange(false);
                    clearErrors("email");
                    onFormChange?.();
                  }}
                  label="이메일"
                  autoCapitalize="none"
                  autoComplete="off"
                  error={error?.message ?? errors.email?.message}
                  success={isSent ? "인증코드가 전송됐습니다." : ""}
                  returnKeyType="next"
                  onSubmitEditing={() => verificationRef.current?.focus()}
                />
              )}
            />
          </View>
          <View style={{ marginTop: 18, width: codeButtonWidth }}>
            <CustomButton
              label={isSending ? "전송 중" : "인증코드 전송"}
              variant="lg"
              tone="primary"
              disabled={isSending || isChecking}
              onPress={handleEmailSend}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="authNum"
          rules={authCodeRules}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              ref={verificationRef}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                clearErrors("authNum");
                onFormChange?.();
              }}
              placeholder="인증코드를 입력하세요."
              label="인증코드"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleEmailCheck}
              error={errors.authNum?.message}
            />
          )}
        />
      </View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label={
            isSubmitting ? "가입 중" : isChecking ? "확인 중" : "회원가입"
          }
          tone="primary"
          disabled={isChecking || isSubmitting}
          onPress={handleEmailCheck}
        />
        {submitError ? (
          <Text className="text-label text-status-error">{submitError}</Text>
        ) : null}
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={onPrev}>
          <Text className="text-label text-label-alternative">이전으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
