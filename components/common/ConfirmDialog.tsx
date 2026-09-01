import CustomModal from "@/components/common/CustomModal";

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
    <CustomModal
      visible={visible}
      title={title}
      description={description}
      onClose={onCancel}
      secondaryAction={{
        label: cancelLabel,
        tone: "neutral",
        onPress: onCancel,
      }}
      primaryAction={{
        label: confirmLabel,
        tone: confirmTone,
        onPress: onConfirm,
      }}
    />
  );
}
