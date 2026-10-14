import { acceptLegalConsents, getLegalConsentStatus } from "@/api/legalConsentApi";
import { PROFILE_IMAGE_SECTIONS } from "@/constants/legalDocuments";
import { useAppAlert } from "@/context/AppAlertContext";
import { useCallback } from "react";

/** 프로필 사진을 서버에 저장하기 전에 이미지 처리 동의를 확인한다. */
export const useProfileImageConsentGuard = () => {
  const { showAlert } = useAppAlert();

  return useCallback(async (): Promise<boolean> => {
    try {
      const status = await getLegalConsentStatus();
      if (status.profileImageAgreed) return true;

      return await new Promise<boolean>((resolve) => {
        let isSettled = false;
        /** 모달 확인 또는 취소 결과를 한 번만 반환한다. */
        const finish = (isAgreed: boolean) => {
          if (isSettled) return;
          isSettled = true;
          resolve(isAgreed);
        };

        showAlert({
          title: "프로필 이미지 처리 동의가 필요해요",
          description: PROFILE_IMAGE_SECTIONS.map((section) => section.body).join(
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
              profileImageAgreed: true,
            })
              .then((nextStatus) => finish(nextStatus.profileImageAgreed))
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
