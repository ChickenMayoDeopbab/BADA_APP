import {
  acceptLegalConsents,
  getLegalConsentStatus,
} from "@/api/legalConsentApi";
import SignupLegalConsentScreen from "@/components/auth/SignupLegalConsentScreen";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import { LegalConsentStatus, OptionalLegalConsents } from "@/api/types";
import { useAppAlert } from "@/context/AppAlertContext";
import { getApiErrorMessage } from "@/api/error";
import { getAuthenticatedAppPath } from "@/utils/legalConsentFlow";
import { clearAuthTokens } from "@/utils/authTokenStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthLegalConsentScreen() {
  const { showAlert } = useAppAlert();
  const { newUser } = useLocalSearchParams<{ newUser?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<LegalConsentStatus | null>(null);

  /** 기존 선택 동의를 불러온 뒤 체크 상태에 반영한다. */
  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getLegalConsentStatus());
    } catch (error) {
      showAlert({
        title: "동의 상태를 확인하지 못했어요",
        description: getApiErrorMessage(
          error,
          "네트워크 상태를 확인하고 다시 시도해 주세요.",
        ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  /** 약관 동의를 취소하면 임시 OAuth 로그인 상태를 정리하고 로그인 화면으로 돌아간다. */
  const handleBack = async () => {
    if (isSubmitting) return;

    await Promise.all([
      clearAuthTokens(),
      AsyncStorage.removeItem("autoLogin"),
    ]);
    router.replace("/auth");
  };

  /** 필수 약관 확인과 사용자가 선택한 두 가지 동의를 서버에 저장한다. */
  const submitConsents = async (consents: OptionalLegalConsents) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const status = await acceptLegalConsents({
        termsOfServiceAgreed: true,
        privacyPolicyAcknowledged: true,
        ...consents,
      });
      if (status.legalActionRequired) {
        throw new Error("필수 약관 동의가 저장되지 않았습니다.");
      }

      router.replace(
        newUser === "true"
          ? "/diagnosis/welcome"
          : await getAuthenticatedAppPath(),
      );
    } catch (error) {
      showAlert({
        title: "동의를 저장하지 못했어요",
        description: getApiErrorMessage(
          error,
          "네트워크 상태를 확인하고 다시 시도해 주세요.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      {isLoading || !status ? (
        <SafeAreaView
          edges={["top", "left", "right"]}
          className="flex-1 bg-background-normal"
        >
          <Top
            title="약관 동의"
            back
            onBack={() => void handleBack()}
            safeArea={false}
          />
          <View className="flex-1 items-center justify-center gap-5 px-8">
            {isLoading ? (
              <LoadingIndicator />
            ) : (
              <>
                <Text className="text-body text-label-alternative">
                  동의 상태를 확인한 후 다시 진행해 주세요.
                </Text>
                <CustomButton
                  label="다시 시도"
                  tone="primary"
                  onPress={() => void loadStatus()}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      ) : (
        <SignupLegalConsentScreen
          confirmLabel="동의하고 시작하기"
          description="필수 항목에 동의하면 바다를 시작할 수 있어요."
          heading="서비스 이용을 위해 약관을 확인해 주세요"
          initialConsents={status}
          isSubmitting={isSubmitting}
          onBack={() => void handleBack()}
          onConfirm={(consents) => void submitConsents(consents)}
        />
      )}
    </>
  );
}
