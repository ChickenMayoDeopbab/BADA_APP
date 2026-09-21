import { postSignup } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import EmailStep from "@/components/authSteps/EmailStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { RegisterFormValues } from "@/types/auth";
import { markDiagnosisRequired } from "@/utils/diagnosisFlow";
import { router } from "expo-router";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  useAndroidBackHandler(() => {
    router.replace("/auth/login");
    return true;
  });

  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const inputTop = Math.min(Math.max(height * 0.4, 260), 380);
  const headerHeight = 74;
  const formTopMargin = Math.max(inputTop - topPadding - headerHeight, 40);
  const [step, setStep] = useState(1);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState("");

  const methods = useForm<RegisterFormValues>({
    defaultValues: {
      email: "",
      authNum: "",
      password: "",
      confirmPassword: "",
      name: "",
      username: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const handleSignup = async () => {
    const {
      email: rawEmail,
      password,
      name: rawName,
      username: rawUsername,
    } = methods.getValues();
    const email = rawEmail.trim();
    const name = rawName.trim();
    const username = rawUsername.trim();

    setIsSigningUp(true);
    setSignupError("");

    try {
      await postSignup({ username, password, email, name });
      await markDiagnosisRequired(username);
      router.replace("/auth/login");
      return true;
    } catch (error) {
      setSignupError(
        getApiErrorMessage(
          error,
          "회원가입에 실패했습니다. 입력 정보를 확인해주세요.",
        ),
      );
      return false;
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: topPadding,
            paddingBottom: 32,
            paddingHorizontal: 32,
            width: "100%",
            maxWidth: isTablet ? 430 : undefined,
            alignSelf: "center",
          }}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <BadaLogo width={70} height={32} />
            <Text className="text-title1 font-bold text-label-strong">
              회원가입
            </Text>
          </View>

          <View style={{ marginTop: formTopMargin }}>
            <FormProvider {...methods}>
              {step === 1 && (
                <EmailStep
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <PasswordStep
                  onPrev={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && (
                <UsernameStep
                  onPrev={() => {
                    setSignupError("");
                    setStep(2);
                  }}
                  onNext={handleSignup}
                  isSubmitting={isSigningUp}
                  submitError={signupError}
                  onFormChange={() => setSignupError("")}
                />
              )}
            </FormProvider>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
