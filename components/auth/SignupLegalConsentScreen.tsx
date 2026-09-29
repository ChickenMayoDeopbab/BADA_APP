import CustomButton from "@/components/common/CustomButton";
import AccordionContent from "@/components/common/AccordionContent";
import Top from "@/components/common/Top";
import {
  LegalDocumentSection,
  SENSITIVE_INFORMATION_SECTIONS,
  TERMS_OF_SERVICE_SECTIONS,
} from "@/constants/legalDocuments";
import { PRIVACY_POLICY_TEXT } from "@/constants/privacyPolicyText";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface SignupLegalConsentScreenProps {
  confirmLabel?: string;
  description?: string;
  heading?: string;
  isSubmitting: boolean;
  onBack?: () => void;
  onConfirm: (sensitiveInformationAgreed: boolean) => void;
  showBack?: boolean;
}

interface ConsentRowProps {
  checked: boolean;
  expanded?: boolean;
  label: string;
  onToggle: () => void;
  onOpen?: () => void;
}

function ConsentRow({
  checked,
  expanded = false,
  label,
  onToggle,
  onOpen,
}: ConsentRowProps) {
  const checkProgress = useRef(
    new Animated.Value(checked ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.timing(checkProgress, {
      toValue: checked ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [checkProgress, checked]);

  const checkboxBackgroundColor = checkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      SEMANTIC_COLORS.fill.alternative,
      SEMANTIC_COLORS.primary.normal,
    ],
  });

  return (
    <View className="min-h-[66px] flex-row items-center gap-2">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        className="min-w-0 flex-1 flex-row items-center gap-4 py-3"
        onPress={onToggle}
      >
        <Animated.View
          className="size-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: checkboxBackgroundColor }}
        >
          <Ionicons
            name="checkmark"
            size={22}
            color={
              checked
                ? SEMANTIC_COLORS.label.buttonText
                : SEMANTIC_COLORS.line.normal
            }
          />
        </Animated.View>
        <Text className="min-w-0 flex-1 text-headline2 font-medium text-label-normal">
          {label}
        </Text>
      </Pressable>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 전문 보기`}
          accessibilityState={{ expanded }}
          hitSlop={8}
          className="p-2"
          onPress={onOpen}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={SEMANTIC_COLORS.line.normal}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function InlineSectionDocument({
  sections,
}: {
  sections: LegalDocumentSection[];
}) {
  return (
    <View className="mb-3 gap-5 rounded-[18px] bg-fill-normal px-5 py-5">
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

function InlineTextDocument({ text }: { text: string }) {
  return (
    <View className="mb-3 rounded-[18px] bg-fill-normal px-5 py-5">
      <Text className="text-label leading-6 text-label-alternative">
        {text}
      </Text>
    </View>
  );
}

type ExpandedConsent = "terms" | "privacy" | "sensitive" | null;

export default function SignupLegalConsentScreen({
  confirmLabel = "동의하고 가입하기",
  description = "필수 항목에 동의하면 회원가입이 완료됩니다.",
  heading = "마지막으로 약관을 확인해 주세요",
  isSubmitting,
  onBack,
  onConfirm,
  showBack = true,
}: SignupLegalConsentScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(false);
  const [expandedConsent, setExpandedConsent] =
    useState<ExpandedConsent>(null);

  const requiredAccepted = termsAccepted && privacyAccepted;
  const allAccepted = requiredAccepted && sensitiveAccepted;

  const toggleDocument = (document: Exclude<ExpandedConsent, null>) => {
    setExpandedConsent((current) =>
      current === document ? null : document,
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background-normal"
    >
      <View
        className="flex-1 bg-background-normal"
        style={{
          width: "100%",
          maxWidth: isTablet ? 560 : undefined,
          alignSelf: "center",
        }}
      >
        <Top
          title="약관 동의"
          back={showBack}
          onBack={isSubmitting ? undefined : onBack}
          safeArea={false}
        />

        <View className="gap-2 px-8 pb-4 pt-3">
          <Text className="text-title1 font-bold text-label-strong">
            {heading}
          </Text>
          <Text className="text-body leading-6 text-label-alternative">
            {description}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-7 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-3 rounded-[22px] bg-fill-normal px-4 py-2">
            <ConsentRow
              checked={allAccepted}
              label="약관 전체 동의"
              onToggle={() => {
                const nextChecked = !allAccepted;
                setTermsAccepted(nextChecked);
                setPrivacyAccepted(nextChecked);
                setSensitiveAccepted(nextChecked);
              }}
            />
          </View>

          <View className="px-1">
            <View className="overflow-hidden">
              <ConsentRow
                checked={termsAccepted}
                expanded={expandedConsent === "terms"}
                label="서비스 이용약관 필수 동의"
                onToggle={() => setTermsAccepted((current) => !current)}
                onOpen={() => toggleDocument("terms")}
              />
              <AccordionContent expanded={expandedConsent === "terms"}>
                <InlineSectionDocument sections={TERMS_OF_SERVICE_SECTIONS} />
              </AccordionContent>
            </View>

            <View className="overflow-hidden">
              <ConsentRow
                checked={privacyAccepted}
                expanded={expandedConsent === "privacy"}
                label="개인정보처리방침 필수 확인"
                onToggle={() => setPrivacyAccepted((current) => !current)}
                onOpen={() => toggleDocument("privacy")}
              />
              <AccordionContent expanded={expandedConsent === "privacy"}>
                <InlineTextDocument text={PRIVACY_POLICY_TEXT} />
              </AccordionContent>
            </View>

            <View className="overflow-hidden">
              <ConsentRow
                checked={sensitiveAccepted}
                expanded={expandedConsent === "sensitive"}
                label="민감정보 처리 선택 동의"
                onToggle={() => setSensitiveAccepted((current) => !current)}
                onOpen={() => toggleDocument("sensitive")}
              />
              <AccordionContent expanded={expandedConsent === "sensitive"}>
                <InlineSectionDocument
                  sections={SENSITIVE_INFORMATION_SECTIONS}
                />
              </AccordionContent>
            </View>
          </View>

          <Text className="px-2 pt-3 text-label leading-6 text-label-alternative">
            민감정보 처리는 동의하지 않아도 일반 서비스를 이용할 수 있습니다.
          </Text>
        </ScrollView>

        <View
          className="bg-background-normal px-7 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <CustomButton
            label={isSubmitting ? "처리 중..." : confirmLabel}
            tone="primary"
            className="min-h-[58px]"
            disabled={!requiredAccepted || isSubmitting}
            onPress={() => onConfirm(sensitiveAccepted)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
