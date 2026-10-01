import { SEMANTIC_COLORS } from "@/design-system";
import { postOAuthToken } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import { setAuthTokens } from "@/utils/authTokenStorage";
import { getAuthenticatedPath } from "@/utils/legalConsentFlow";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
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

const OAUTH_EXCHANGE_DEDUPLICATION_MS = 10_000;
const oauthTokenExchangeByCode = new Map<
  string,
  ReturnType<typeof postOAuthToken>
>();

/** 같은 OAuth 콜백이 딥 링크와 인증 세션 반환값으로 중복 처리되지 않게 한다. */
const exchangeOAuthCodeOnce = (code: string) => {
  const pendingExchange = oauthTokenExchangeByCode.get(code);
  if (pendingExchange) return pendingExchange;

  const exchange = postOAuthToken({ code });
  oauthTokenExchangeByCode.set(code, exchange);
  void exchange.then(
    () => {
      setTimeout(() => {
        if (oauthTokenExchangeByCode.get(code) === exchange) {
          oauthTokenExchangeByCode.delete(code);
        }
      }, OAUTH_EXCHANGE_DEDUPLICATION_MS);
    },
    () => {
      if (oauthTokenExchangeByCode.get(code) === exchange) {
        oauthTokenExchangeByCode.delete(code);
      }
    },
  );

  return exchange;
};

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<OAuthCallbackParams>();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState(
    "소셜 로그인에 실패했어요. 다시 시도해 주세요.",
  );
  const exchangeStartedRef = useRef(false);

  const code = getFirstParam(params.code)?.trim();
  const oauthError = getFirstParam(params.error)?.trim();
  const oauthErrorMessage =
    getFirstParam(params.error_description)?.trim() ||
    getFirstParam(params.message)?.trim();

  useEffect(() => {
    // Android에서는 화면이 먼저 열린 뒤 딥 링크 파라미터가 채워질 수 있다.
    // 파라미터가 준비되기 전에 잠그면 이후 code가 들어와도 토큰 교환이 실행되지 않는다.
    if (!code && !oauthError) return;

    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    // iOS Safari View Controller가 딥 링크 뒤에 남지 않도록 닫는다.
    // Android에는 dismissBrowser가 없어 호출 결과에 .catch를 사용하면 effect가 중단된다.
    if (Platform.OS === "ios") {
      void WebBrowser.dismissBrowser().catch(() => undefined);
    }

    if (oauthError) {
      setErrorMessage(
        oauthErrorMessage ||
          "소셜 로그인이 취소되었거나 처리 중 문제가 발생했어요.",
      );
      setStatus("error");
      return;
    }

    if (!code) return;
    const callbackCode = code;

    const completeOAuthLogin = async () => {
      try {
        const response = await exchangeOAuthCodeOnce(callbackCode);
        const { accessToken, refreshToken, isNewUser } = response.data ?? {};

        if (!accessToken || !refreshToken) {
          throw new Error("OAuth token response is invalid");
        }

        await Promise.all([
          setAuthTokens({ accessToken, refreshToken }),
          AsyncStorage.setItem("autoLogin", "true"),
        ]);

        router.replace(
          isNewUser
            ? {
                pathname: "/auth/terms",
                params: { newUser: "true" },
              }
            : await getAuthenticatedPath(),
        );
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            "로그인 확인에 실패했어요. 다시 시도해 주세요.",
          ),
        );
        setStatus("error");
      }
    };

    void completeOAuthLogin();
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
