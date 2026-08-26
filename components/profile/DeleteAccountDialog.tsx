import { deleteWithdraw } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import CustomButton from "@/components/common/CustomButton";
import { PALETTE } from "@/design-system/colors";
import { clearAuthTokens } from "@/utils/authTokenStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";

const dialogShadow = {
  boxShadow: `0px 0px 12.5px 0px ${PALETTE.common[100]}33`,
} as const;

interface DeleteAccountDialogProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeleteAccountDialog({
  visible,
  onClose,
}: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleWithdraw = async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteWithdraw();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "잠시 후 다시 시도해 주세요.",
      );

      console.warn("[회원 탈퇴 실패]", message);

      Alert.alert("탈퇴 실패", message);
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
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-common-100/30 px-[33px]">
        <Pressable
          accessibilityLabel="회원 탈퇴 창 닫기"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          className="w-full gap-4 p-5 rounded-dialog bg-background-normal"
          style={dialogShadow}
        >
          <View className="w-full gap-[10px] overflow-hidden">
            <Text className="font-bold text-headline2 text-label-normal">
              정말 탈퇴할까요?
            </Text>
            <Text className="font-medium text-label text-label-alternative">
              탈퇴 후에는 계정을 복구할 수 없어요.
            </Text>
          </View>
          <View className="flex-row items-center w-full gap-2 overflow-hidden">
            <View className="flex-1 min-w-0">
              <CustomButton
                label="취소하기"
                variant="md"
                tone="neutral"
                onPress={onClose}
              />
            </View>
            <View className="flex-1 min-w-0">
              <CustomButton
                label={isDeleting ? "탈퇴 중..." : "탈퇴하기"}
                variant="md"
                tone="danger"
                disabled={isDeleting}
                onPress={handleWithdraw}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
