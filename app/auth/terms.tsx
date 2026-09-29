import { acceptLegalConsents } from "@/api/legalConsentApi";
import SignupLegalConsentScreen from "@/components/auth/SignupLegalConsentScreen";
import { useAppAlert } from "@/context/AppAlertContext";
import { getApiErrorMessage } from "@/api/error";
import { getAuthenticatedAppPath } from "@/utils/legalConsentFlow";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

export default function OAuthLegalConsentScreen() {
  const { showAlert } = useAppAlert();
  const { newUser } = useLocalSearchParams<{ newUser?: string }>();
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
      const status = await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        sensitiveInformationAgreed,
        profileImageAgreed: false,
      });
      if (status.legalActionRequired) {
        throw new Error("필수 약관 동의가 저장되지 않았습니다.");
      }

      router.replace(
        newUser === "true"
          ? "/diagnosis/welcome"
          : await getAuthenticatedAppPath(),
      );
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
