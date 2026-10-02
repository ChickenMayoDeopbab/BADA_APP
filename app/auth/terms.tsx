import {
  acceptLegalConsents,
  getLegalConsentStatus,
} from "@/api/legalConsentApi";
import SignupLegalConsentScreen from "@/components/auth/SignupLegalConsentScreen";
import { useAppAlert } from "@/context/AppAlertContext";
import { getApiErrorMessage } from "@/api/error";
import { getAuthenticatedAppPath } from "@/utils/legalConsentFlow";
import { clearAuthTokens } from "@/utils/authTokenStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

  /** 약관 동의를 취소하면 임시 OAuth 로그인 상태를 정리하고 로그인 화면으로 돌아간다. */
  const handleBack = async () => {
    if (isSubmitting) return;

    await Promise.all([
      clearAuthTokens(),
      AsyncStorage.removeItem("autoLogin"),
    ]);
    router.replace("/auth");
  };

  const submitConsents = async (sensitiveInformationAgreed: boolean) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const currentStatus = await getLegalConsentStatus();
      const status = await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        sensitiveInformationAgreed,
        // 이 화면에서는 프로필 이미지 동의를 받지 않으므로 기존 값을 보존한다.
        profileImageAgreed: currentStatus.profileImageAgreed,
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
        onBack={() => void handleBack()}
        onConfirm={(sensitiveInformationAgreed) =>
          void submitConsents(sensitiveInformationAgreed)
        }
      />
    </>
  );
}
