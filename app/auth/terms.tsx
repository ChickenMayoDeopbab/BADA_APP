import { acceptLegalConsents } from "@/api/legalConsentApi";
import SignupLegalConsentScreen from "@/components/auth/SignupLegalConsentScreen";
import { useAppAlert } from "@/context/AppAlertContext";
import { getApiErrorMessage } from "@/api/error";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

export default function OAuthLegalConsentScreen() {
  const { showAlert } = useAppAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const submitConsents = async (sensitiveInformationAgreed: boolean) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        sensitiveInformationAgreed,
        profileImageAgreed: false,
      });
      router.replace("/diagnosis/welcome");
    } catch (error) {
      showAlert({
        title: "동의를 저장하지 못했어요",
        description: getApiErrorMessage(
          error,
          "네트워크 상태를 확인하고 다시 시도해 주세요.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SignupLegalConsentScreen
        confirmLabel="동의하고 시작하기"
        description="필수 항목에 동의하면 바다를 시작할 수 있어요."
        heading="서비스 이용을 위해 약관을 확인해 주세요"
        isSubmitting={isSubmitting}
        onConfirm={(sensitiveInformationAgreed) =>
          void submitConsents(sensitiveInformationAgreed)
        }
        showBack={false}
      />
    </>
  );
}
