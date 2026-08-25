import CustomButton from "@/components/common/CustomButton";
import { PALETTE } from "@/design-system/colors";
import { Modal, Pressable, Text, View } from "react-native";

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
          className="w-full gap-4 rounded-dialog bg-background-normal p-5"
          style={dialogShadow}
        >
          <View className="w-full gap-[10px] overflow-hidden">
            <Text className="text-headline2 font-bold text-label-normal">
              정말 탈퇴할까요?
            </Text>
            <Text className="text-label font-medium text-label-alternative">
              탈퇴 후에는 계정을 복구할 수 없어요.
            </Text>
          </View>
          <View className="w-full flex-row items-center gap-2 overflow-hidden">
            <View className="min-w-0 flex-1">
              <CustomButton
                label="취소하기"
                variant="md"
                tone="neutral"
                onPress={onClose}
              />
            </View>
            <View className="min-w-0 flex-1">
              <CustomButton
                label="탈퇴하기"
                variant="md"
                tone="danger"
                onPress={onClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
