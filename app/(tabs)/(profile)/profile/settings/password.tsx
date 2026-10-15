import { patchPassword } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import { useMyPage, myPageQueryKeys } from "@/hooks/useMyPage";
import { getAuthLoginMethod } from "@/utils/authTokenStorage";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import {
  createConfirmPasswordRules,
  newPasswordRules,
  oldPasswordRules,
} from "@/constants/authValidation";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const passwordFields = [
  { name: "oldPassword", label: "현재 비밀번호" },
  { name: "newPassword", label: "새 비밀번호" },
  { name: "confirmPassword", label: "새 비밀번호 확인" },
] as const;

/** 로그인한 계정의 이메일로 현재 비밀번호를 확인하고 비밀번호를 변경한다. */
export default function PasswordSettingsScreen() {
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();
  const loginMethodQuery = useQuery({
    queryKey: ["auth", "loginMethod"],
    queryFn: getAuthLoginMethod,
    staleTime: 0,
    gcTime: 0,
  });
  const profileQuery = useMyPage(loginMethodQuery.data === "password");
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState<
    Partial<Record<keyof PasswordFormValues, boolean>>
  >({});
  const {
    control,
    getValues,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  });

  /** 중복 제출을 막고 변경 실패 시 입력값을 유지한다. */
  const handleChangePassword = async (values: PasswordFormValues) => {
    const email = profileQuery.data?.data.email?.trim();
    if (!email || isSubmittingRef.current) return;
    if (values.oldPassword === values.newPassword) {
      setError("newPassword", {
        message: "현재 비밀번호와 다른 비밀번호를 입력해주세요.",
      });
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if ((await getAuthLoginMethod()) !== "password") {
        showAlert({
          title: "비밀번호를 변경할 수 없는 계정이에요",
          description:
            "아이디와 비밀번호로 로그인한 계정에서만 변경할 수 있어요.",
        });
        return;
      }
      await patchPassword({
        email,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      void queryClient.invalidateQueries({ queryKey: myPageQueryKeys.all });
      Keyboard.dismiss();
      reset();
      showAlert({
        title: "비밀번호를 변경했어요",
        onConfirm: () => router.back(),
      });
    } catch (error) {
      setError("oldPassword", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "비밀번호를 변경하지 못했어요. 현재 비밀번호를 확인해 주세요.",
        ),
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-normal">
      <Top title="비밀번호 변경" back />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow gap-4 px-8 py-6"
        >
          {loginMethodQuery.isPending ? (
            <LoadingIndicator />
          ) : loginMethodQuery.data !== "password" ? (
            <View className="gap-4">
              <Text className="text-body text-label-alternative">
                아이디와 비밀번호로 로그인한 계정에서만 비밀번호를 변경할 수
                있어요.
              </Text>
              <CustomButton label="돌아가기" onPress={() => router.back()} />
            </View>
          ) : profileQuery.isPending ? (
            <LoadingIndicator />
          ) : profileQuery.isError || !profileQuery.data?.data.email ? (
            <View className="gap-4">
              <Text className="text-body text-status-error">
                계정 정보를 불러오지 못했어요.
              </Text>
              <CustomButton
                label="다시 불러오기"
                onPress={() => void profileQuery.refetch()}
              />
            </View>
          ) : (
            <>
              <Text className="mb-4 text-body text-label-alternative">
                영문과 숫자를 포함한 8자 이상의 비밀번호를 입력해 주세요.
              </Text>
              {passwordFields.map(({ name, label }) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  rules={
                    name === "oldPassword"
                      ? oldPasswordRules
                      : name === "newPassword"
                        ? newPasswordRules
                        : createConfirmPasswordRules(() =>
                            getValues("newPassword"),
                          )
                  }
                  render={({ field: { value, onChange, onBlur } }) => (
                    <CustomInput
                      label={label}
                      accessibilityLabel={label}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      editable={!isSubmitting}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!visibleFields[name]}
                      textContentType={
                        name === "oldPassword" ? "password" : "newPassword"
                      }
                      error={errors[name]?.message}
                      rightIcon={
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${label} ${visibleFields[name] ? "숨기기" : "보기"}`}
                          hitSlop={10}
                          onPress={() =>
                            setVisibleFields((current) => ({
                              ...current,
                              [name]: !current[name],
                            }))
                          }
                        >
                          <Ionicons
                            name={
                              visibleFields[name]
                                ? "eye-off-outline"
                                : "eye-outline"
                            }
                            size={22}
                            color={SEMANTIC_COLORS.label.alternative}
                          />
                        </Pressable>
                      }
                    />
                  )}
                />
              ))}
              <CustomButton
                label={isSubmitting ? "변경 중" : "비밀번호 변경하기"}
                tone="primary"
                disabled={isSubmitting}
                onPress={() => void handleSubmit(handleChangePassword)()}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
