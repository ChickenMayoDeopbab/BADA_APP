import {
  postEmailCheck,
  postEmailSend,
  postFindId,
} from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import AuthFlowHeader from "@/components/auth/AuthFlowHeader";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FindIdFormValues = {
  email: string;
  authNum: string;
};

type FindIdView = "form" | "success" | "failure";

const emailRules = {
  required: "이메일을 입력해주세요.",
  pattern: {
    value: /^[a-zA-Z0-9+-_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    message: "올바른 이메일 형식이 아닙니다.",
  },
};

export default function FindIdScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);
  const [view, setView] = useState<FindIdView>("form");
  const [username, setUsername] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verificationRef = useRef<TextInput>(null);

  const {
    control,
    getValues,
    setError,
    clearErrors,
    trigger,
    reset,
    formState: { errors },
  } = useForm<FindIdFormValues>({
    defaultValues: { email: "", authNum: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const handleBack = () => {
    if (view !== "form") {
      setView("form");
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

  const handleFindId = async () => {
    const isValid = await trigger(["email", "authNum"]);
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
    } catch (error) {
      setError("authNum", {
        type: "server",
        message: getApiErrorMessage(
          error,
          "인증코드가 올바르지 않습니다.",
        ),
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await postFindId({ email: email.trim() });
      if (!response.data) {
        setView("failure");
        return;
      }
      setUsername(response.data);
      setView("success");
    } catch {
      setView("failure");
    } finally {
      setIsSubmitting(false);
      Keyboard.dismiss();
    }
  };

  const handleRetry = () => {
    reset();
    setUsername("");
    setIsEmailSent(false);
    setView("form");
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
          <AuthFlowHeader title="아이디 찾기" onBack={handleBack} />

          {view === "form" ? (
            <>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  paddingTop: Math.min(Math.max(height * 0.12, 72), 112),
                  paddingBottom: 16,
                }}
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row items-start gap-x-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="email"
                      rules={emailRules}
                      render={({ field: { value, onChange } }) => (
                        <CustomInput
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
                      rules={{
                        required: "인증코드를 입력해주세요.",
                        validate: (value) =>
                          value.trim().length > 0 ||
                          "인증코드를 입력해주세요.",
                      }}
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
                      onSubmitEditing={handleFindId}
                      error={errors.authNum?.message}
                    />
                  )}
                />
              </ScrollView>

              <View className="pt-3 pb-7">
                <CustomButton
                  label={isSubmitting ? "확인 중" : "아이디 찾기"}
                  backgroundColor="#0AE365"
                  disabled={isSubmitting}
                  onPress={handleFindId}
                />
              </View>
            </>
          ) : (
            <View className="justify-between flex-1 pb-7">
              <View
                className="items-center px-4"
                style={{
                  marginTop: Math.min(Math.max(height * 0.15, 104), 150),
                }}
              >
                {view === "success" ? (
                  <>
                    <Ionicons
                      name="search-outline"
                      size={82}
                      color="#9FAAB2"
                    />
                    <Text className="mt-7 text-lg font-bold leading-7 text-center text-[#333535]">
                      이메일 정보와 일치하는 아이디는{"\n"}
                      <Text className="text-[#00C95A]">{username}</Text>
                      입니다.
                    </Text>
                  </>
                ) : (
                  <>
                    <Image
                      source={require("../../assets/sadFace.gif")}
                      style={{ width: 88, height: 88 }}
                      contentFit="contain"
                    />
                    <Text className="mt-7 text-lg font-bold leading-7 text-center text-[#333535]">
                      이메일 정보와 일치하는 아이디를{"\n"}찾을 수 없습니다.
                    </Text>
                  </>
                )}
              </View>

              <View className="gap-y-3">
                {view === "success" ? (
                  <>
                    <CustomButton
                      label="로그인 하러가기"
                      backgroundColor="#0AE365"
                      onPress={() => router.replace("/auth/login")}
                    />
                    <CustomButton
                      label="비밀번호 재설정"
                      color="#0D0D0E"
                      backgroundColor="#F8F8F8"
                      onPress={() =>
                        router.push({
                          pathname: "/auth/reset-password",
                          params: {
                            username,
                            email: getValues("email").trim(),
                          },
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <CustomButton
                      label="다시 시도하기"
                      backgroundColor="#0AE365"
                      onPress={handleRetry}
                    />
                    <CustomButton
                      label="로그인 하러가기"
                      color="#0D0D0E"
                      backgroundColor="#F8F8F8"
                      onPress={() => router.replace("/auth/login")}
                    />
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
