import { getLegalConsentStatus } from "@/api/legalConsentApi";
import { useAppAlert } from "@/context/AppAlertContext";
import { router } from "expo-router";
import { useCallback } from "react";

export const useSensitiveConsentGuard = () => {
  const { showAlert } = useAppAlert();

  return useCallback(async (): Promise<boolean> => {
    try {
      const status = await getLegalConsentStatus();
      if (status.sensitiveInformationAgreed) return true;

      showAlert({
        title: "민감정보 처리 동의가 필요해요",
        description:
          "이 기능은 통화불안 진단 또는 음성·훈련 분석을 위해 민감정보 처리 동의가 필요합니다. 일반 서비스는 동의하지 않아도 이용할 수 있어요.",
        cancelLabel: "나중에",
        confirmLabel: "동의하러 가기",
        onConfirm: () =>
          router.push("/(tabs)/(profile)/profile/settings/privacy"),
      });
      return false;
    } catch {
      showAlert({
        title: "동의 상태를 확인하지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
      return false;
    }
  }, [showAlert]);
};
