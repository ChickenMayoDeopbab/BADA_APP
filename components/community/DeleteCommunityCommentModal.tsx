import CustomModal from "@/components/common/CustomModal";

interface DeleteCommunityCommentModalProps {
  visible: boolean;
  isDeleting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteCommunityCommentModal({
  visible,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteCommunityCommentModalProps) {
  return (
    <CustomModal
      visible={visible}
      title="정말 댓글을 삭제할까요?"
      description="삭제 후에는 댓글을 복구할 수 없어요."
      errorMessage={errorMessage}
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
