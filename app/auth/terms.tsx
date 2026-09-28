import {
  acceptLegalConsents,
  getLegalConsentStatus,
} from "@/api/legalConsentApi";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import {
  LegalDocumentSection,
  PRIVACY_POLICY_SECTIONS,
  SENSITIVE_INFORMATION_SECTIONS,
  TERMS_OF_SERVICE_SECTIONS,
} from "@/constants/legalDocuments";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { getAuthenticatedAppPath } from "@/utils/legalConsentFlow";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
    new RNAnimated.Value(checked ? 1 : 0),
  ).current;

  useEffect(() => {
    RNAnimated.timing(checkProgress, {
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
        <RNAnimated.View
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
        </RNAnimated.View>
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

function InlineDocument({ sections }: { sections: LegalDocumentSection[] }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.duration(220)}
      className="mb-3 gap-5 rounded-[18px] bg-fill-normal px-5 py-5"
    >
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
    </Animated.View>
  );
}

type ExpandedConsent = "terms" | "privacy" | "sensitive" | null;

export default function TermsAgreementScreen() {
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const headerHeight = Math.min(Math.max(height * 0.2, 130), 190);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(false);
  const [expandedConsent, setExpandedConsent] =
    useState<ExpandedConsent>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredAccepted = termsAccepted && privacyAccepted;
  const allAccepted = requiredAccepted && sensitiveAccepted;

  const loadStatus = async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const status = await getLegalConsentStatus();
      if (!status.legalActionRequired) {
        router.replace(await getAuthenticatedAppPath());
        return;
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleAccept = async () => {
    if (!requiredAccepted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const status = await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        sensitiveInformationAgreed: sensitiveAccepted,
      });
      setTermsAccepted(status.termsOfServiceAgreed);
      setPrivacyAccepted(status.privacyPolicyAcknowledged);
      setSensitiveAccepted(status.sensitiveInformationAgreed);

      if (status.legalActionRequired) {
        throw new Error("Required legal consent was not saved");
      }
      router.replace(await getAuthenticatedAppPath());
    } catch {
      showAlert({
        title: "동의 내용을 저장하지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-fill-alternative"
    >
      <View
        className="flex-1"
        style={{
          width: "100%",
          maxWidth: isTablet ? 560 : undefined,
          alignSelf: "center",
        }}
      >
        <View
          className="justify-end px-8 pb-5"
          style={{ height: headerHeight }}
        >
          <Text className="text-title1 font-bold leading-10 text-label-strong">
            약관 동의가{"\n"}필요해요
          </Text>
        </View>

        <View className="flex-1 overflow-hidden rounded-t-[36px] bg-background-normal pt-5">
          {isLoading ? (
            <View className="flex-1 items-center justify-center gap-4 px-8">
              <LoadingIndicator />
              <Text className="text-body text-label-alternative">
                동의 상태를 확인하고 있어요.
              </Text>
            </View>
          ) : loadFailed ? (
            <View className="flex-1 items-center justify-center gap-5 px-8">
              <Text className="text-center text-body leading-6 text-label-alternative">
                동의 상태를 불러오지 못했어요.{"\n"}잠시 후 다시 시도해 주세요.
              </Text>
              <View className="w-full">
                <CustomButton
                  label="다시 시도"
                  tone="primary"
                  onPress={() => void loadStatus()}
                />
              </View>
            </View>
          ) : (
            <>
              <ScrollView
                className="flex-1"
                contentContainerClassName="px-7 pb-8 pt-2"
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
                  <Animated.View layout={LinearTransition.duration(220)}>
                    <ConsentRow
                      checked={termsAccepted}
                      expanded={expandedConsent === "terms"}
                      label="서비스 이용약관 필수 동의"
                      onToggle={() => setTermsAccepted((current) => !current)}
                      onOpen={() =>
                        setExpandedConsent((current) =>
                          current === "terms" ? null : "terms",
                        )
                      }
                    />
                    {expandedConsent === "terms" ? (
                      <InlineDocument sections={TERMS_OF_SERVICE_SECTIONS} />
                    ) : null}
                  </Animated.View>

                  <Animated.View layout={LinearTransition.duration(220)}>
                    <ConsentRow
                      checked={privacyAccepted}
                      expanded={expandedConsent === "privacy"}
                      label="개인정보처리방침 필수 확인"
                      onToggle={() => setPrivacyAccepted((current) => !current)}
                      onOpen={() =>
                        setExpandedConsent((current) =>
                          current === "privacy" ? null : "privacy",
                        )
                      }
                    />
                    {expandedConsent === "privacy" ? (
                      <InlineDocument sections={PRIVACY_POLICY_SECTIONS} />
                    ) : null}
                  </Animated.View>

                  <Animated.View layout={LinearTransition.duration(220)}>
                    <ConsentRow
                      checked={sensitiveAccepted}
                      expanded={expandedConsent === "sensitive"}
                      label="민감정보 처리 선택 동의"
                      onToggle={() => setSensitiveAccepted((current) => !current)}
                      onOpen={() =>
                        setExpandedConsent((current) =>
                          current === "sensitive" ? null : "sensitive",
                        )
                      }
                    />
                    {expandedConsent === "sensitive" ? (
                      <InlineDocument
                        sections={SENSITIVE_INFORMATION_SECTIONS}
                      />
                    ) : null}
                  </Animated.View>
                </View>

                <Text className="px-2 pt-3 text-label leading-6 text-label-alternative">
                  필수 항목에 동의해야 서비스를 이용할 수 있어요. 민감정보
                  처리는 동의하지 않아도 일반 서비스를 이용할 수 있습니다.
                </Text>
              </ScrollView>

              <View
                className="bg-background-normal px-7 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <CustomButton
                  label={isSubmitting ? "저장 중..." : "확인"}
                  tone="primary"
                  className="min-h-[58px]"
                  disabled={!requiredAccepted || isSubmitting}
                  onPress={() => void handleAccept()}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
