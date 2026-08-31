import CustomButton from "@/components/common/CustomButton";
import { PALETTE } from "@/design-system/colors";
import { Modal, Pressable, Text, View } from "react-native";

const dialogShadow = {
  boxShadow: `0px 0px 12.5px 0px ${PALETTE.common[100]}33`,
} as const;

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** 확인 버튼 색 — 되돌릴 수 없는 동작이면 danger */
  confirmTone?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}

/** 확인 / 취소 두 가지 선택지를 주는 공용 다이얼로그 */
export default function ConfirmDialog({
  visible,
  title,
  description,
  cancelLabel = "취소하기",
  confirmLabel,
  confirmTone = "primary",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-common-100/30 px-[33px]">
        <Pressable
          accessibilityLabel={`${title} 창 닫기`}
          onPress={onCancel}
          className="absolute inset-0"
        />
        <View
          className="w-full gap-4 rounded-dialog bg-background-normal p-5"
          style={dialogShadow}
        >
          <View className="w-full gap-[10px] overflow-hidden">
            <Text className="text-headline2 font-bold text-label-normal">{title}</Text>
            {/* 설명은 선택 항목이라 있을 때만 그린다 */}
            {description && (
              <Text className="text-label font-medium text-label-alternative">
                {description}
              </Text>
            )}
          </View>
          <View className="w-full flex-row items-center gap-2 overflow-hidden">
            <View className="min-w-0 flex-1">
              <CustomButton
                label={cancelLabel}
                variant="md"
                tone="neutral"
                onPress={onCancel}
              />
            </View>
            <View className="min-w-0 flex-1">
              <CustomButton
                label={confirmLabel}
                variant="md"
                tone={confirmTone}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
