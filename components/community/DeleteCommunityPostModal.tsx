import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DeleteCommunityPostModalProps {
  visible: boolean;
  isDeleting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteCommunityPostModal({
  visible,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteCommunityPostModalProps) {
  const close = () => {
    if (!isDeleting) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable
        className="flex-1 items-center justify-center px-[33px]"
        style={{ backgroundColor: `${PALETTE.common[100]}4D` }}
        onPress={close}
      >
        <Pressable
          accessibilityRole="alert"
          className="w-full max-w-[336px] gap-y-4 rounded-dialog bg-background-normal p-5"
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
            <Text className="text-headline2 font-bold text-label-normal">
              정말 게시글을 삭제할까요?
            </Text>
            <Text className="text-label font-medium text-label-alternative">
              삭제 후에는 게시글을 복구할 수 없어요.
            </Text>
            {errorMessage && (
              <Text className="text-caption font-medium text-status-error">
                {errorMessage}
              </Text>
            )}
          </View>

          <View className="flex-row gap-x-2">
            <TouchableOpacity
              className="h-[38px] flex-1 items-center justify-center rounded-control bg-fill-normal"
              activeOpacity={0.8}
              disabled={isDeleting}
              onPress={onCancel}
            >
              <Text className="text-label font-bold text-label-normal">
                취소하기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-[38px] flex-1 items-center justify-center rounded-control bg-status-error"
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
                <Text className="text-label font-bold text-label-buttonText">
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
