import CustomModal from "@/components/common/CustomModal";

interface BlockCommunityUserModalProps {
  visible: boolean;
  userName: string;
  isBlocking: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BlockCommunityUserModal({
  visible,
  userName,
  isBlocking,
  errorMessage,
  onCancel,
  onConfirm,
}: BlockCommunityUserModalProps) {
  return (
    <CustomModal
      visible={visible}
      title={`${userName}님을 차단할까요?`}
      description="차단하면 이 사용자의 게시글과 댓글이 즉시 표시되지 않습니다. 프로필 설정의 차단 사용자 관리에서 언제든 해제할 수 있습니다."
      errorMessage={errorMessage}
      onClose={onCancel}
      closeOnBackdrop={!isBlocking}
      secondaryAction={{
        label: "취소하기",
        tone: "neutral",
        disabled: isBlocking,
        onPress: onCancel,
      }}
      primaryAction={{
        label: "차단하기",
        loadingLabel: "차단 중...",
        loading: isBlocking,
        tone: "danger",
        onPress: onConfirm,
      }}
    />
  );
}
