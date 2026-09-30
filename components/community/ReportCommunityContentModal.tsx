import type { CommunityReportReason } from "@/api/types";
import CustomModal from "@/components/common/CustomModal";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const REPORT_REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: "ABUSE", label: "욕설 및 괴롭힘" },
  { value: "SEXUAL", label: "음란성 콘텐츠" },
  { value: "HATE", label: "혐오 표현" },
  { value: "VIOLENCE", label: "폭력 및 위협" },
  { value: "SPAM", label: "스팸 및 광고" },
  { value: "PRIVACY", label: "개인정보 노출" },
  { value: "OTHER", label: "기타" },
];

interface ReportCommunityContentModalProps {
  visible: boolean;
  targetLabel: "게시글" | "댓글" | "답글";
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (reason: CommunityReportReason) => void;
}

export default function ReportCommunityContentModal({
  visible,
  targetLabel,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: ReportCommunityContentModalProps) {
  const [selectedReason, setSelectedReason] =
    useState<CommunityReportReason | null>(null);

  useEffect(() => {
    if (!visible) setSelectedReason(null);
  }, [visible]);

  return (
    <CustomModal
      visible={visible}
      title={`${targetLabel} 신고하기`}
      description="신고 사유를 선택해 주세요. 검토 후 운영정책에 따라 조치합니다."
      errorMessage={errorMessage}
      onClose={onCancel}
      closeOnBackdrop={!isSubmitting}
      secondaryAction={{
        label: "취소하기",
        tone: "neutral",
        disabled: isSubmitting,
        onPress: onCancel,
      }}
      primaryAction={{
        label: "신고하기",
        loadingLabel: "신고 중...",
        loading: isSubmitting,
        disabled: !selectedReason,
        onPress: () => {
          if (selectedReason) onConfirm(selectedReason);
        },
      }}
    >
      <View className="mt-1 gap-1">
        {REPORT_REASONS.map((reason) => {
          const selected = selectedReason === reason.value;
          return (
            <Pressable
              key={reason.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: isSubmitting }}
              disabled={isSubmitting}
              className="flex-row items-center gap-2 rounded-control px-2 py-2 active:bg-fill-pressed"
              onPress={() => setSelectedReason(reason.value)}
            >
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={21}
                color={
                  selected
                    ? SEMANTIC_COLORS.primary.normal
                    : SEMANTIC_COLORS.line.normal
                }
              />
              <Text className="text-label font-medium text-label-normal">
                {reason.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </CustomModal>
  );
}
