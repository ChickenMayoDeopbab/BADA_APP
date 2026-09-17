import { postCheckUsername } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { nameRules, usernameRules } from "@/constants/authValidation";
import { RegisterFormValues } from "@/types/auth";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

type UsernameProps = {
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onNext: () => void;
};

export default function UsernameStep({
  inputTranslateY,
  onNext,
}: UsernameProps) {
  const { width } = useWindowDimensions();
  const codeButtonWidth = Math.min(Math.max(width * 0.31, 116), 128);
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const nameRef = useRef<TextInput>(null);
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
                  }}
                  label="아이디"
                  returnKeyType="next"
                  onSubmitEditing={() => nameRef.current?.focus()}
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
        <Controller
          control={control}
          name="name"
          rules={nameRules}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              ref={nameRef}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                clearErrors("name");
              }}
              label="이름"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              error={errors.name?.message}
            />
          )}
        />
      </Animated.View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="다음으로"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          disabled={isLoading}
          onPress={handleNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={() => router.replace("/auth")}>
          <Text className="text-sm text-[#5C5E5E]">이미 계정이 있어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
