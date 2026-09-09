import CustomButton from "@/components/common/CustomButton";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

type CustomModalActionTone = "primary" | "neutral" | "danger";

export interface CustomModalAction {
  label: string;
  onPress: () => void;
  tone?: CustomModalActionTone;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

interface CustomModalProps {
  visible: boolean;
  title: string;
  description?: string;
  errorMessage?: string | null;
  icon?: ReactNode;
  children?: ReactNode;
  primaryAction: CustomModalAction;
  secondaryAction?: CustomModalAction;
  onClose: () => void;
  closeOnBackdrop?: boolean;
}

const dialogShadow = {
  shadowColor: PALETTE.common[100],
  shadowOpacity: 0.2,
  shadowRadius: 12.5,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
};

function ModalActionButton({ action }: { action: CustomModalAction }) {
  const isDisabled = action.disabled || action.loading;

  return (
    <View className="min-w-0 flex-1">
      <CustomButton
        label={
          action.loading
            ? (action.loadingLabel ?? action.label)
            : action.label
        }
        variant="md"
        tone={action.tone ?? "primary"}
        disabled={isDisabled}
        icon={
          action.loading ? (
            <ActivityIndicator
              size="small"
              color={SEMANTIC_COLORS.line.normal}
            />
          ) : undefined
        }
        onPress={action.onPress}
      />
    </View>
  );
}

/** 확인·안내형 모달의 공통 레이아웃과 버튼 상태를 담당한다. */
export default function CustomModal({
  visible,
  title,
  description,
  errorMessage,
  icon,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  closeOnBackdrop = true,
}: CustomModalProps) {
  const isBusy = Boolean(primaryAction.loading || secondaryAction?.loading);
  const close = () => {
    if (!isBusy) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={close}
    >
      <View className="flex-1 items-center justify-center bg-common-100/30 px-[33px]">
        <Pressable
          accessibilityLabel={`${title} 창 닫기`}
          disabled={!closeOnBackdrop || isBusy}
          onPress={close}
          className="absolute inset-0"
        />
        <View
          accessibilityRole="alert"
          className="w-full max-w-[336px] gap-4 rounded-dialog bg-background-normal p-5"
          style={dialogShadow}
        >
          <View className="w-full gap-[10px]">
            {icon ? <View className="items-center">{icon}</View> : null}
            <Text
              className={`text-headline2 font-bold text-label-normal ${
                icon ? "text-center" : ""
              }`}
            >
              {title}
            </Text>
            {description ? (
              <Text
                className={`text-label font-medium text-label-alternative ${
                  icon ? "text-center" : ""
                }`}
              >
                {description}
              </Text>
            ) : null}
            {children}
            {errorMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-caption font-medium text-status-error"
              >
                {errorMessage}
              </Text>
            ) : null}
          </View>

          <View className="w-full flex-row items-center gap-2">
            {secondaryAction ? (
              <ModalActionButton action={secondaryAction} />
            ) : null}
            <ModalActionButton action={primaryAction} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
