import { postSignup } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import EmailStep from "@/components/authSteps/EmailStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";
import SignupLegalConsentScreen from "@/components/auth/SignupLegalConsentScreen";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { RegisterFormValues } from "@/types/auth";
import { markDiagnosisRequired } from "@/utils/diagnosisFlow";
import { savePendingLegalConsent } from "@/utils/pendingLegalConsent";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const [isConsentVisible, setIsConsentVisible] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useAndroidBackHandler(() => {
    if (isConsentVisible) {
      if (!isSigningUp) setIsConsentVisible(false);
      return true;
    }
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
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [signupError, setSignupError] = useState("");
  const inputTranslateY = useRef(new Animated.Value(0)).current;

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

  const handleSignup = async (sensitiveInformationAgreed: boolean) => {
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
      await Promise.all([
        markDiagnosisRequired(username),
        savePendingLegalConsent(sensitiveInformationAgreed, username),
      ]);
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

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      Animated.timing(inputTranslateY, {
        toValue: -80,
        duration: Platform.OS === "ios" ? event.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? event.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inputTranslateY]);

  if (isConsentVisible) {
    return (
      <SignupLegalConsentScreen
        isSubmitting={isSigningUp}
        onBack={() => setIsConsentVisible(false)}
        onConfirm={(sensitiveInformationAgreed) =>
          void handleSignup(sensitiveInformationAgreed).then((succeeded) => {
            if (!succeeded) setIsConsentVisible(false);
          })
        }
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
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
              <UsernameStep
                inputTranslateY={inputTranslateY}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <PasswordStep
                inputTranslateY={inputTranslateY}
                onPrev={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <EmailStep
                inputTranslateY={inputTranslateY}
                onPrev={() => {
                  setSignupError("");
                  setStep(2);
                }}
                onNext={() => {
                  setSignupError("");
                  setIsConsentVisible(true);
                  return true;
                }}
                isSent={isEmailSent}
                onSentChange={setIsEmailSent}
                isSubmitting={isSigningUp}
                submitError={signupError}
                onFormChange={() => setSignupError("")}
              />
            )}
          </FormProvider>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
