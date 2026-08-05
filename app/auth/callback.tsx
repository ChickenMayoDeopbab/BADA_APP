import { postOAuthToken } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import { setAuthTokens } from "@/utils/authTokenStorage";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
  const exchangeStartedRef = useRef(false);

  const code = getFirstParam(params.code)?.trim();
  const oauthError = getFirstParam(params.error)?.trim();
  const oauthErrorMessage =
    getFirstParam(params.error_description)?.trim() ||
    getFirstParam(params.message)?.trim();

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    if (oauthError) {
      setErrorMessage(
        oauthErrorMessage ||
          "소셜 로그인이 취소되었거나 처리 중 문제가 발생했어요.",
      );
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("로그인 정보를 받지 못했어요. 다시 시도해 주세요.");
      setStatus("error");
      return;
    }

    const completeOAuthLogin = async () => {
      try {
        const response = await postOAuthToken({ code });
        const { accessToken, refreshToken } = response.data ?? {};

        if (!accessToken || !refreshToken) {
          throw new Error("OAuth token response is invalid");
        }

        await Promise.all([
          setAuthTokens({ accessToken, refreshToken }),
          AsyncStorage.setItem("autoLogin", "true"),
        ]);

        router.replace("/home");
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
    <SafeAreaView className="flex-1 bg-white">
      <View className="items-center justify-center flex-1 px-8">
        <BadaLogo width={110} height={52} />

        {status === "loading" ? (
          <View className="items-center mt-12">
            <ActivityIndicator size="large" color="#0AE365" />
            <Text className="mt-6 text-2xl font-bold text-[#0D0D0E]">
              로그인 확인 중
            </Text>
            <Text className="mt-2 text-base text-center text-[#5C5E5E]">
              잠시만 기다려 주세요.
            </Text>
          </View>
        ) : (
          <View className="items-center w-full mt-12">
            <Ionicons name="alert-circle-outline" size={72} color="#F65C5C" />
            <Text className="mt-6 text-2xl font-bold text-[#0D0D0E]">
              로그인 실패
            </Text>
            <Text className="mt-3 text-base leading-6 text-center text-[#5C5E5E]">
              {errorMessage}
            </Text>
            <View className="w-full mt-10">
              <CustomButton
                label="로그인 화면으로 돌아가기"
                backgroundColor="#0AE365"
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
