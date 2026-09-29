import {
  acceptLegalConsents,
  getLegalConsentStatus,
} from "@/api/legalConsentApi";
import { useAppAlert } from "@/context/AppAlertContext";
import { useCallback } from "react";

export const useSensitiveConsentGuard = () => {
  const { showAlert } = useAppAlert();

  return useCallback(async (): Promise<boolean> => {
    try {
      const status = await getLegalConsentStatus();
      if (status.sensitiveInformationAgreed) return true;

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (result: boolean) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };

        showAlert({
          title: "민감정보 처리 동의가 필요해요",
          description:
            "통화불안 진단 답변과 점수, 음성 분석 결과, 훈련 분석 및 피드백을 제공하기 위해 민감정보를 처리합니다. 동의하지 않아도 일반 서비스는 이용할 수 있어요.",
          cancelLabel: "나중에",
          confirmLabel: "동의하기",
          onCancel: () => finish(false),
          onConfirm: () => {
            void acceptLegalConsents({
              termsOfServiceAgreed: true,
              privacyPolicyAcknowledged: true,
              sensitiveInformationAgreed: true,
              profileImageAgreed: status.profileImageAgreed,
            })
              .then((nextStatus) =>
                finish(nextStatus.sensitiveInformationAgreed),
              )
              .catch(() => {
                finish(false);
                showAlert({
                  title: "동의를 저장하지 못했어요",
                  description: "잠시 후 다시 시도해 주세요.",
                });
              });
          },
        });
      });
    } catch {
      showAlert({
        title: "동의 상태를 확인하지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
      return false;
    }
  }, [showAlert]);
};
