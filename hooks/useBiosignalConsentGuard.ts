import { acceptLegalConsents, getLegalConsentStatus } from "@/api/legalConsentApi";
import type { LegalConsentStatus } from "@/api/types";
import { BIOSIGNAL_SECTIONS } from "@/constants/legalDocuments";
import { useAppAlert } from "@/context/AppAlertContext";
import { useCallback } from "react";

type ShowAlert = ReturnType<typeof useAppAlert>["showAlert"];

/** 생체신호 처리 동의 팝업을 띄우고 동의를 저장했는지 돌려준다. 다른 선택 동의는 현재 값을 그대로 보내 바뀌지 않게 한다. */
export const askBiosignalConsent = (
  showAlert: ShowAlert,
  status: LegalConsentStatus,
): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    let isSettled = false;
    /** 모달 확인 또는 취소 결과를 한 번만 반환한다. */
    const finish = (isAgreed: boolean) => {
      if (isSettled) return;
      isSettled = true;
      resolve(isAgreed);
    };

    showAlert({
      title: "생체신호 처리 동의가 필요해요",
      description: BIOSIGNAL_SECTIONS.map((section) => section.body).join(
        "\n\n",
      ),
      cancelLabel: "나중에",
      confirmLabel: "동의하기",
      onCancel: () => finish(false),
      onConfirm: () => {
        void acceptLegalConsents({
          termsOfServiceAgreed: true,
          privacyPolicyAcknowledged: true,
          sensitiveInformationAgreed: status.sensitiveInformationAgreed,
          profileImageAgreed: status.profileImageAgreed,
          biosignalAgreed: true,
        })
          .then((nextStatus) => finish(nextStatus.biosignalAgreed))
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

/** 워치 생체신호 측정을 켜기 전에 생체신호 처리 동의를 확인하고, 없으면 동의를 받는다. */
export const useBiosignalConsentGuard = () => {
  const { showAlert } = useAppAlert();

  return useCallback(async (): Promise<boolean> => {
    try {
      const status = await getLegalConsentStatus();
      if (status.biosignalAgreed) return true;
      return await askBiosignalConsent(showAlert, status);
    } catch {
      showAlert({
        title: "동의 상태를 확인하지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
      return false;
    }
  }, [showAlert]);
};
