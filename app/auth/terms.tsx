import {
  getAppleLogin,
  getGoogleLogin,
  getNaverLogin,
} from "@/api/authApi";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import {
  COMMUNITY_SAFETY_NOTICE,
  DEVELOPER_CONTACT_EMAIL,
  TRAINING_RECORD_RETENTION_NOTICE,
  VOICE_DATA_RETENTION_NOTICE,
} from "@/constants/legal";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AgreementDestination = "login" | "signup" | "google" | "naver" | "apple";

interface AgreementCheckboxProps {
  checked: boolean;
  label: string;
  onPress: () => void;
}

const isAgreementDestination = (
  value: string | string[] | undefined,
): value is AgreementDestination =>
  typeof value === "string" &&
  ["login", "signup", "google", "naver", "apple"].includes(value);

function AgreementCheckbox({
  checked,
  label,
  onPress,
}: AgreementCheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-3 py-2 active:opacity-60"
      onPress={onPress}
    >
      <Ionicons
        name={checked ? "checkmark-circle" : "checkmark-circle-outline"}
        size={25}
        color={
          checked
            ? SEMANTIC_COLORS.primary.normal
            : SEMANTIC_COLORS.line.normal
        }
      />
      <Text className="flex-1 text-body font-medium text-label-normal">
        {label}
      </Text>
    </Pressable>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2 rounded-component bg-fill-normal px-4 py-4">
      <Text className="text-headline2 font-bold text-label-normal">{title}</Text>
      <Text className="text-label leading-6 text-label-alternative">
        {children}
      </Text>
    </View>
  );
}

export default function TermsAgreementScreen() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { showAlert } = useAppAlert();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const loginInProgress = useRef(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const destination = useMemo<AgreementDestination>(
    () => (isAgreementDestination(next) ? next : "login"),
    [next],
  );
  const allAccepted = termsAccepted && privacyAccepted;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/auth");
  };

  useAndroidBackHandler(() => {
    handleBack();
    return true;
  });

  const handleContinue = async () => {
    if (!allAccepted || loginInProgress.current) return;

    if (destination === "login") {
      router.replace("/auth/login");
      return;
    }
    if (destination === "signup") {
      router.replace("/auth/signup");
      return;
    }

    const login =
      destination === "google"
        ? getGoogleLogin
        : destination === "naver"
          ? getNaverLogin
          : getAppleLogin;

    loginInProgress.current = true;
    setIsContinuing(true);
    try {
      const callbackUrl = await login();
      if (!callbackUrl) return;

      const callback = new URL(callbackUrl);
      const path = `${callback.hostname}${callback.pathname}`.replace(/^\/+/, "");
      if (callback.protocol !== "bada:" || path !== "auth/callback") {
        throw new Error("Unexpected OAuth callback");
      }

      router.replace({
        pathname: "/auth/callback",
        params: {
          code: callback.searchParams.get("code") ?? "",
          error: callback.searchParams.get("error") ?? "",
          error_description:
            callback.searchParams.get("error_description") ?? "",
          message: callback.searchParams.get("message") ?? "",
        },
      });
    } catch {
      showAlert({
        title: "로그인 오류",
        description:
          "소셜 로그인 페이지를 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      loginInProgress.current = false;
      setIsContinuing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      <View
        className="flex-1"
        style={{
          width: "100%",
          maxWidth: isTablet ? 560 : undefined,
          alignSelf: "center",
        }}
      >
        <Top title="이용약관 동의" back onBack={handleBack} safeArea={false} />

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-8 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-2 pb-2 pt-3">
            <Text className="text-title1 font-bold text-label-strong">
              바다를 이용하기 전에 확인해 주세요
            </Text>
            <Text className="text-body leading-6 text-label-alternative">
              안전한 서비스 이용과 개인정보 보호를 위한 필수 안내입니다.
            </Text>
          </View>

          <PolicySection title="커뮤니티 이용약관">
            {COMMUNITY_SAFETY_NOTICE}
          </PolicySection>

          <PolicySection title="음성 데이터 및 훈련 기록 보관">
            {`• ${VOICE_DATA_RETENTION_NOTICE}\n• ${TRAINING_RECORD_RETENTION_NOTICE}`}
          </PolicySection>

          <PolicySection title="개인정보 처리방침">
            {`• 수집 항목: 계정 정보, 훈련 중 생성된 음성 데이터, 훈련 내용과 분석 결과\n• 이용 목적: 회원 식별, 대화 훈련 분석, 맞춤형 피드백 제공 및 서비스 이용 기록 관리\n• 보관 및 파기: 안내된 보관기간이 지나거나 회원이 삭제를 요청하면 복구할 수 없는 방법으로 지체 없이 삭제\n• 이용자 권리: 회원은 훈련 기록 삭제 또는 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.\n• 개인정보 관련 문의: ${DEVELOPER_CONTACT_EMAIL}`}
          </PolicySection>

          <View className="mt-2 rounded-component border border-line-alternative px-4 py-3">
            <AgreementCheckbox
              checked={allAccepted}
              label="전체 동의"
              onPress={() => {
                const nextChecked = !allAccepted;
                setTermsAccepted(nextChecked);
                setPrivacyAccepted(nextChecked);
              }}
            />
            <View className="my-1 h-px bg-line-alternative" />
            <AgreementCheckbox
              checked={termsAccepted}
              label="[필수] 이용약관에 동의합니다."
              onPress={() => setTermsAccepted((current) => !current)}
            />
            <AgreementCheckbox
              checked={privacyAccepted}
              label="[필수] 개인정보 수집 및 이용에 동의합니다."
              onPress={() => setPrivacyAccepted((current) => !current)}
            />
          </View>
        </ScrollView>

        <View className="px-8 pb-6 pt-3">
          <CustomButton
            label={isContinuing ? "처리 중..." : "동의하고 계속하기"}
            tone="primary"
            disabled={!allAccepted || isContinuing}
            onPress={() => void handleContinue()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
