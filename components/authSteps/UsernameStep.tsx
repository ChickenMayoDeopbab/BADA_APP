import { postCheckUsername } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { nameRules, usernameRules } from "@/constants/authValidation";
import { RegisterFormValues } from "@/types/auth";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

type UsernameProps = {
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => boolean | Promise<boolean>;
  isSubmitting?: boolean;
  submitError?: string;
  onFormChange?: () => void;
};

export default function UsernameStep({
  inputTranslateY,
  onPrev,
  onNext,
  isSubmitting = false,
  submitError = "",
  onFormChange,
}: UsernameProps) {
  const { width } = useWindowDimensions();
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    getValues,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useFormContext<RegisterFormValues>();

  const handleUsernameCheck = async () => {
    const isValid = await trigger("username");
    if (!isValid) return false;

    const username = getValues("username").trim();
    setIsLoading(true);

    try {
      const response = await postCheckUsername({ username });
      if (!response.data) {
        setCheckedUsername(null);
        setError("username", {
          type: "server",
          message: "이미 사용 중인 아이디입니다.",
        });
        return false;
      }

      clearErrors("username");
      setCheckedUsername(username);
      return true;
    } catch (error) {
      setCheckedUsername(null);
      setError("username", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "아이디 중복 확인에 실패했습니다. 다시 시도해주세요.",
        ),
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    const isValid = await trigger(["name", "username"]);
    if (!isValid) return;

    const username = getValues("username").trim();
    const isAvailable =
      checkedUsername === username || (await handleUsernameCheck());

    if (isAvailable) await onNext();
  };

  return (
    <View>
      <Animated.View
        className="mb-5"
        style={{ transform: [{ translateY: inputTranslateY }] }}
      >
        <Controller
          control={control}
          name="name"
          rules={nameRules}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              value={value}
              onChangeText={(text) => {
                onChange(text);
                clearErrors("name");
                onFormChange?.();
              }}
              label="이름"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              error={errors.name?.message}
            />
          )}
        />
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="username"
              rules={usernameRules}
              render={({ field: { value, onChange } }) => (
                <CustomInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setCheckedUsername(null);
                    clearErrors("username");
                    onFormChange?.();
                  }}
                  label="아이디"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                  error={errors.username?.message}
                  success={
                    checkedUsername === value.trim()
                      ? "사용 가능한 아이디입니다."
                      : ""
                  }
                />
              )}
            />
          </View>
          <View style={{ marginTop: 18, width: codeButtonWidth }}>
            <CustomButton
              label="중복 확인"
              variant="lg"
              backgroundColor="#0AE365"
              disabled={isLoading}
              onPress={handleUsernameCheck}
            />
          </View>
        </View>
      </Animated.View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label={isSubmitting ? "가입 중" : "회원가입"}
          color="#F6F6F6"
          backgroundColor="#0AE365"
          disabled={isLoading || isSubmitting}
          onPress={handleNext}
        />
        {submitError ? (
          <Text className="text-xs text-center text-[#FF0000]">
            {submitError}
          </Text>
        ) : null}
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={onPrev}>
          <Text className="text-sm text-[#5C5E5E]">이전으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
