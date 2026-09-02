import {
  patchPassword,
  postEmailCheck,
  postEmailSend,
} from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import PartyFace from "@/assets/partyFace.svg";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Top from "@/components/common/Top";
import {
  authCodeRules,
  createConfirmPasswordRules,
  emailRules,
  loginUsernameRules,
  newPasswordRules,
  oldPasswordRules,
} from "@/constants/authValidation";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ResetPasswordFormValues = {
  username: string;
  email: string;
  authNum: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ResetPasswordStep = "identity" | "password" | "success";

function getInitialParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    username?: string;
    email?: string;
  }>();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);
  const [step, setStep] = useState<ResetPasswordStep>("identity");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    old: false,
    next: false,
    confirm: false,
  });
  const emailRef = useRef<TextInput>(null);
  const verificationRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    getValues,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      username: getInitialParam(params.username),
      email: getInitialParam(params.email),
      authNum: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const handleBack = () => {
    if (step === "password") {
      setStep("identity");
      return;
    }
    if (step === "success") {
      router.replace("/auth/login");
      return;
    }
    router.back();
  };

  const handleEmailSend = async () => {
    const isValid = await trigger("email");
    if (!isValid) return;

    setIsSending(true);
    try {
      await postEmailSend({ email: getValues("email").trim() });
      clearErrors("email");
      setIsEmailSent(true);
      verificationRef.current?.focus();
    } catch (error) {
      setIsEmailSent(false);
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

  const handleIdentityNext = async () => {
    const isValid = await trigger(["username", "email", "authNum"]);
    if (!isValid) return;
    if (!isEmailSent) {
      setError("email", {
        type: "server",
        message: "먼저 인증코드를 전송해주세요.",
      });
      return;
    }

    const { email, authNum } = getValues();
    setIsSubmitting(true);

    try {
      await postEmailCheck({
        email: email.trim(),
        authNum: authNum.trim(),
      });
      clearErrors("authNum");
      clearErrors("username");
      setStep("password");
      Keyboard.dismiss();
    } catch (error) {
      setError("authNum", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "인증코드가 올바르지 않습니다.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const isValid = await trigger([
      "oldPassword",
      "newPassword",
      "confirmPassword",
    ]);
    if (!isValid) return;

    const { email, oldPassword, newPassword } = getValues();
    setIsSubmitting(true);
    try {
      await patchPassword({
        email: email.trim(),
        oldPassword,
        newPassword,
      });
      setStep("success");
      Keyboard.dismiss();
    } catch (error) {
      setError("oldPassword", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "기존 비밀번호가 올바르지 않거나 변경에 실패했습니다.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = (key: keyof typeof passwordVisibility) => {
    setPasswordVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          className="flex-1 px-7"
          style={{
            width: "100%",
            maxWidth: isTablet ? 430 : undefined,
            alignSelf: "center",
          }}
        >
          <Top title="비밀번호 재설정" back onBack={handleBack} safeArea={false} />

          {step === "identity" && (
            <>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  paddingTop: Math.min(Math.max(height * 0.08, 44), 78),
                  paddingBottom: 16,
                }}
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Controller
                  control={control}
                  name="username"
                  rules={loginUsernameRules}
                  render={({ field: { value, onChange } }) => (
                    <CustomInput
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        clearErrors("username");
                      }}
                      label="아이디"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      error={errors.username?.message}
                    />
                  )}
                />

                <View className="flex-row items-start gap-x-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="email"
                      rules={emailRules}
                      render={({ field: { value, onChange } }) => (
                        <CustomInput
                          ref={emailRef}
                          value={value}
                          onChangeText={(text) => {
                            onChange(text);
                            setIsEmailSent(false);
                            clearErrors("email");
                          }}
                          label="이메일"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          returnKeyType="next"
                          onSubmitEditing={handleEmailSend}
                          error={errors.email?.message}
                          success={
                            isEmailSent ? "인증코드가 전송됐습니다." : ""
                          }
                        />
                      )}
                    />
                  </View>
                  <View style={{ marginTop: 18, width: codeButtonWidth }}>
                    <CustomButton
                      label={isSending ? "전송 중" : "인증코드 전송"}
                      variant="lg"
                      backgroundColor="#0AE365"
                      disabled={isSending}
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
                      }}
                      label="인증코드"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleIdentityNext}
                      error={errors.authNum?.message}
                    />
                  )}
                />
              </ScrollView>

              <View className="pt-3 pb-7">
                <CustomButton
                  label={isSubmitting ? "확인 중" : "다음으로"}
                  backgroundColor="#0AE365"
                  disabled={isSubmitting}
                  onPress={handleIdentityNext}
                />
              </View>
            </>
          )}

          {step === "password" && (
            <>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  paddingTop: Math.min(Math.max(height * 0.08, 44), 78),
                  paddingBottom: 16,
                }}
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Controller
                  control={control}
                  name="oldPassword"
                  rules={oldPasswordRules}
                  render={({ field: { value, onChange } }) => (
                    <CustomInput
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        clearErrors("oldPassword");
                      }}
                      label="기존 비밀번호"
                      secureTextEntry={!passwordVisibility.old}
                      returnKeyType="next"
                      onSubmitEditing={() => newPasswordRef.current?.focus()}
                      error={errors.oldPassword?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => toggleVisibility("old")}
                        >
                          <Ionicons
                            name={
                              passwordVisibility.old
                                ? "eye-off-sharp"
                                : "eye"
                            }
                            size={20}
                            color="#BDBEBE"
                          />
                        </TouchableOpacity>
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="newPassword"
                  rules={newPasswordRules}
                  render={({ field: { value, onChange } }) => (
                    <CustomInput
                      ref={newPasswordRef}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        clearErrors("newPassword");
                      }}
                      label="새 비밀번호"
                      secureTextEntry={!passwordVisibility.next}
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        confirmPasswordRef.current?.focus()
                      }
                      error={errors.newPassword?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => toggleVisibility("next")}
                        >
                          <Ionicons
                            name={
                              passwordVisibility.next
                                ? "eye-off-sharp"
                                : "eye"
                            }
                            size={20}
                            color="#BDBEBE"
                          />
                        </TouchableOpacity>
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={createConfirmPasswordRules(
                    () => getValues("newPassword"),
                    "새 비밀번호를 다시 입력해주세요.",
                  )}
                  render={({ field: { value, onChange } }) => (
                    <CustomInput
                      ref={confirmPasswordRef}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        clearErrors("confirmPassword");
                      }}
                      label="새 비밀번호 확인"
                      placeholder="새 비밀번호를 다시 입력하세요."
                      secureTextEntry={!passwordVisibility.confirm}
                      returnKeyType="done"
                      onSubmitEditing={handlePasswordReset}
                      error={errors.confirmPassword?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => toggleVisibility("confirm")}
                        >
                          <Ionicons
                            name={
                              passwordVisibility.confirm
                                ? "eye-off-sharp"
                                : "eye"
                            }
                            size={20}
                            color="#BDBEBE"
                          />
                        </TouchableOpacity>
                      }
                    />
                  )}
                />
              </ScrollView>

              <View className="pt-3 pb-7">
                <CustomButton
                  label={isSubmitting ? "변경 중" : "비밀번호 재설정"}
                  backgroundColor="#0AE365"
                  disabled={isSubmitting}
                  onPress={handlePasswordReset}
                />
              </View>
            </>
          )}

          {step === "success" && (
            <View className="justify-between flex-1 pb-7">
              <View
                className="items-center px-4"
                style={{
                  marginTop: Math.min(Math.max(height * 0.15, 104), 150),
                }}
              >
                <PartyFace width={88} height={88} />
                <Text className="mt-7 text-lg font-bold leading-7 text-center text-[#333535]">
                  비밀번호가 성공적으로{"\n"}변경되었습니다!
                </Text>
              </View>

              <CustomButton
                label="로그인 하러가기"
                backgroundColor="#0AE365"
                onPress={() => router.replace("/auth/login")}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
