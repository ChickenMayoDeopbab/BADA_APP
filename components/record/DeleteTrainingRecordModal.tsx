import CustomModal from "@/components/common/CustomModal";

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
  return (
    <CustomModal
      visible={visible}
      title="정말 기록을 삭제할까요?"
      description="삭제 후에는 기록을 복구할 수 없어요."
      onClose={onCancel}
      secondaryAction={{
        label: "취소하기",
        tone: "neutral",
        disabled: isDeleting,
        onPress: onCancel,
      }}
      primaryAction={{
        label: "삭제하기",
        loadingLabel: "삭제 중...",
        tone: "danger",
        loading: isDeleting,
        onPress: onConfirm,
      }}
    />
  );
}
