import {
  acceptLegalConsents,
  getLegalConsentStatus,
  withdrawSensitiveInformationConsent,
} from "@/api/legalConsentApi";
import { LegalConsentStatus } from "@/api/types";
import AccordionContent from "@/components/common/AccordionContent";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import {
  LegalDocumentSection,
  SENSITIVE_INFORMATION_SECTIONS,
  TERMS_OF_SERVICE_SECTIONS,
} from "@/constants/legalDocuments";
import { PRIVACY_POLICY_TEXT } from "@/constants/privacyPolicyText";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface DocumentRowProps {
  expanded: boolean;
  label: string;
  onPress: () => void;
}

function DocumentRow({ expanded, label, onPress }: DocumentRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      className="min-h-14 flex-row items-center justify-between px-4"
      onPress={onPress}
    >
      <Text className="text-body font-medium text-label-normal">{label}</Text>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={22}
        color={SEMANTIC_COLORS.line.normal}
      />
    </Pressable>
  );
}

function SectionDocument({
  sections,
}: {
  sections: LegalDocumentSection[];
}) {
  return (
    <View className="mx-4 mb-4 gap-5 rounded-[18px] bg-fill-normal px-5 py-5">
      {sections.map((section) => (
        <View key={section.title} className="gap-1.5">
          <Text className="text-label font-bold text-label-normal">
            {section.title}
          </Text>
          <Text className="text-label leading-6 text-label-alternative">
            {section.body}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TextDocument({ text }: { text: string }) {
  return (
    <View className="mx-4 mb-4 rounded-[18px] bg-fill-normal px-5 py-5">
      <Text className="text-label leading-6 text-label-alternative">
        {text}
      </Text>
    </View>
  );
}

type ExpandedDocument = "terms" | "privacy" | "sensitive" | null;

export default function PrivacySettingsScreen() {
  const { showAlert } = useAppAlert();
  const [status, setStatus] = useState<LegalConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedDocument, setExpandedDocument] =
    useState<ExpandedDocument>(null);

  const toggleDocument = (
    document: Exclude<ExpandedDocument, null>,
  ) => {
    setExpandedDocument((current) =>
      current === document ? null : document,
    );
  };

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getLegalConsentStatus());
    } catch {
      showAlert({
        title: "동의 상태를 불러오지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const agreeSensitiveInformation = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const nextStatus = await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        sensitiveInformationAgreed: true,
        profileImageAgreed: status?.profileImageAgreed ?? false,
      });
      setStatus(nextStatus);
      showAlert({ title: "민감정보 처리에 동의했어요" });
    } catch {
      showAlert({
        title: "동의를 저장하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const withdrawSensitiveInformation = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await withdrawSensitiveInformationConsent();
      setStatus(await getLegalConsentStatus());
      showAlert({ title: "민감정보 처리 동의를 철회했어요" });
    } catch {
      showAlert({
        title: "동의를 철회하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmWithdrawal = () => {
    showAlert({
      title: "민감정보 처리 동의를 철회할까요?",
      description:
        "철회 후 통화불안 진단과 음성·훈련 분석 기능을 이용하려면 다시 동의해야 합니다.",
      cancelLabel: "취소",
      confirmLabel: "철회하기",
      confirmTone: "danger",
      onConfirm: () => void withdrawSensitiveInformation(),
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title="개인정보 관리" back safeArea={false} />
      <ScrollView
        className="flex-1 bg-background-alternative"
        contentContainerClassName="gap-6 px-8 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-component bg-background-normal">
          <View className="overflow-hidden">
            <DocumentRow
              expanded={expandedDocument === "terms"}
              label="서비스 이용약관"
              onPress={() => toggleDocument("terms")}
            />
            <AccordionContent expanded={expandedDocument === "terms"}>
              <SectionDocument sections={TERMS_OF_SERVICE_SECTIONS} />
            </AccordionContent>
          </View>
          <View className="mx-4 h-px bg-line-alternative" />
          <View className="overflow-hidden">
            <DocumentRow
              expanded={expandedDocument === "privacy"}
              label="개인정보처리방침"
              onPress={() => toggleDocument("privacy")}
            />
            <AccordionContent expanded={expandedDocument === "privacy"}>
              <TextDocument text={PRIVACY_POLICY_TEXT} />
            </AccordionContent>
          </View>
          <View className="mx-4 h-px bg-line-alternative" />
          <View className="overflow-hidden">
            <DocumentRow
              expanded={expandedDocument === "sensitive"}
              label="민감정보 처리 안내"
              onPress={() => toggleDocument("sensitive")}
            />
            <AccordionContent expanded={expandedDocument === "sensitive"}>
              <SectionDocument sections={SENSITIVE_INFORMATION_SECTIONS} />
            </AccordionContent>
          </View>
        </View>

        <View className="gap-3 rounded-component bg-background-normal p-5">
          <Text className="text-headline2 font-bold text-label-normal">
            민감정보 처리 동의
          </Text>
          {isLoading ? (
            <View className="items-center py-5">
              <LoadingIndicator size="small" />
            </View>
          ) : (
            <>
              <Text className="text-body leading-6 text-label-alternative">
                {status?.sensitiveInformationAgreed
                  ? "현재 동의 상태입니다. 철회하면 진단 및 음성·훈련 분석 기능이 제한됩니다."
                  : "현재 미동의 상태입니다. 일반 서비스는 계속 이용할 수 있습니다."}
              </Text>
              <CustomButton
                label={
                  isUpdating
                    ? "처리 중..."
                    : status?.sensitiveInformationAgreed
                      ? "동의 철회하기"
                      : "동의하기"
                }
                tone={status?.sensitiveInformationAgreed ? "neutral" : "primary"}
                disabled={isUpdating || !status}
                onPress={
                  status?.sensitiveInformationAgreed
                    ? confirmWithdrawal
                    : () => void agreeSensitiveInformation()
                }
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
