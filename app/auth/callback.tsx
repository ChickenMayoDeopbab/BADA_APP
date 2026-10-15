import { completeOAuthLoginOnce } from "@/utils/oauthLogin";
import { SEMANTIC_COLORS } from "@/design-system";
import { getApiErrorMessage } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CallbackStatus = "loading" | "error";

type OAuthCallbackParams = {
  code?: string | string[];
  error?: string | string[];
  error_description?: string | string[];
  message?: string | string[];
};

const getFirstParam = (value?: string | string[]): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<OAuthCallbackParams>();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState(
    "소셜 로그인에 실패했어요. 다시 시도해 주세요.",
  );

  const code = getFirstParam(params.code)?.trim();
  const oauthError = getFirstParam(params.error)?.trim();
  const oauthErrorMessage =
    getFirstParam(params.error_description)?.trim() ||
    getFirstParam(params.message)?.trim();

  useEffect(() => {
    let isActive = true;
    if (!code && !oauthError) {
      // Android의 늦은 파라미터 주입은 기다리되 잘못된 콜백에서 무한 로딩하지 않는다.
      const timer = setTimeout(() => {
        setErrorMessage("로그인 인증코드를 받지 못했어요. 다시 로그인해 주세요.");
        setStatus("error");
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (oauthError) {
      setErrorMessage(oauthErrorMessage || "소셜 로그인이 취소되었거나 처리 중 문제가 발생했어요.");
      setStatus("error");
      return;
    }
    if (!code) return;
    setStatus("loading");
    void completeOAuthLoginOnce(code).then(
      (nextPath) => { if (isActive) router.replace(nextPath); },
      (error: unknown) => {
        if (!isActive) return;
        setErrorMessage(getApiErrorMessage(error, "로그인 확인에 실패했어요. 다시 시도해 주세요."));
        setStatus("error");
      },
    );
    return () => { isActive = false; };
  }, [code, oauthError, oauthErrorMessage]);

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      <View className="items-center justify-center flex-1 px-8">
        <BadaLogo width={110} height={52} />

        {status === "loading" ? (
          <View className="items-center mt-12">
            <LoadingIndicator />
            <Text className="mt-6 text-title2 font-bold text-label-normal">
              로그인 확인 중
            </Text>
            <Text className="mt-2 text-body text-center text-label-alternative">
              잠시만 기다려 주세요.
            </Text>
          </View>
        ) : (
          <View className="items-center w-full mt-12">
            <Ionicons name="alert-circle-outline" size={72} color="#F65C5C" />
            <Text className="mt-6 text-title2 font-bold text-label-normal">
              로그인 실패
            </Text>
            <Text className="mt-3 text-body leading-6 text-center text-label-alternative">
              {errorMessage}
            </Text>
            <View className="w-full mt-10">
              <CustomButton
                label="로그인 화면으로 돌아가기"
                backgroundColor={SEMANTIC_COLORS.primary.normal}
                color="#FFFFFF"
                onPress={() => router.replace("/auth")}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
