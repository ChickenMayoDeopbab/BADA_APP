import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type DeleteTrainingRecordModalProps = {
  visible: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteTrainingRecordModal({
  visible,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteTrainingRecordModalProps) {
  const handleClose = () => {
    if (!isDeleting) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="items-center justify-center flex-1 px-[33px]"
        style={{ backgroundColor: `${PALETTE.common[100]}4D` }}
        onPress={handleClose}
      >
        <Pressable
          accessibilityRole="alert"
          className="w-full max-w-[336px] p-5 bg-background-normal rounded-dialog gap-y-4"
          style={{
            shadowColor: PALETTE.common[100],
            shadowOpacity: 0.2,
            shadowRadius: 12.5,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="gap-y-[10px]">
            <Text className="font-bold text-headline2 text-label-normal">
              정말 기록을 삭제할까요?
            </Text>
            <Text className="font-medium text-label text-label-alternative">
              삭제 후에는 기록을 복구할 수 없어요.
            </Text>
          </View>

          <View className="flex-row gap-x-2">
            <TouchableOpacity
              className="items-center justify-center flex-1 h-[38px] bg-fill-normal rounded-control"
              activeOpacity={0.8}
              disabled={isDeleting}
              onPress={onCancel}
            >
              <Text className="font-bold text-label text-label-normal">
                취소하기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center justify-center flex-1 h-[38px] bg-status-error rounded-control"
              activeOpacity={0.8}
              disabled={isDeleting}
              onPress={onConfirm}
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={SEMANTIC_COLORS.label.buttonText}
                />
              ) : (
                <Text className="font-bold text-label text-label-buttonText">
                  삭제하기
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
