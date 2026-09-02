import { deleteWithdraw } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import CustomModal from "@/components/common/CustomModal";
import { clearAuthTokens } from "@/utils/authTokenStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";

interface DeleteAccountDialogProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeleteAccountDialog({
  visible,
  onClose,
}: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setErrorMessage(null);
  }, [visible]);

  const handleWithdraw = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteWithdraw();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "잠시 후 다시 시도해 주세요.",
      );
      console.warn("[회원 탈퇴 실패]", message);
      setErrorMessage(message);
      setIsDeleting(false);
      return;
    }

    const cleanupResults = await Promise.allSettled([
      clearAuthTokens(),
      AsyncStorage.multiRemove([
        "autoLogin",
        "authenticatedUsername",
        "diagnosisResult",
      ]),
    ]);

    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("[회원 탈퇴 후 로컬 정보 삭제 실패]", result.reason);
      }
    });

    onClose();
    router.replace("/auth");
  };

  return (
    <CustomModal
      visible={visible}
      title="정말 탈퇴할까요?"
      description="탈퇴 후에는 계정을 복구할 수 없어요."
      errorMessage={errorMessage}
      onClose={onClose}
      secondaryAction={{
        label: "취소하기",
        tone: "neutral",
        disabled: isDeleting,
        onPress: onClose,
      }}
      primaryAction={{
        label: "탈퇴하기",
        loadingLabel: "탈퇴 중...",
        tone: "danger",
        loading: isDeleting,
        onPress: () => void handleWithdraw(),
      }}
    />
  );
}
