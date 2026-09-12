import {
  getAppleLogin,
  getGoogleLogin,
  getNaverLogin,
} from "@/api/authApi";
import BadaLogo from "@/assets/badaLogo2.svg";
import NaverLogo from "@/assets/naver.svg";
import CustomButton from "@/components/common/CustomButton";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";

export default function AuthScreen() {
  useDoubleBackExit();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const bottomPadding = Math.min(Math.max(height * 0.1, 64), 96);
  const loginInProgress = useRef(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleOAuthLogin = async (
    login: () => Promise<string | undefined>,
  ) => {
    if (loginInProgress.current) return;
    loginInProgress.current = true;
    setIsLoggingIn(true);
    try {
      const callbackUrl = await login();
      if (callbackUrl) {
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
            error_description: callback.searchParams.get("error_description") ?? "",
            message: callback.searchParams.get("message") ?? "",
          },
        });
      }
    } catch {
      Alert.alert(
        "로그인 오류",
        "소셜 로그인 페이지를 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      loginInProgress.current = false;
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <View
        className="items-center justify-between flex-1 px-8"
        style={{
          paddingBottom: bottomPadding,
          width: "100%",
          maxWidth: isTablet ? 430 : undefined,
          alignSelf: "center",
        }}
      >
        <View className="justify-center flex-1">
          <BadaLogo width={125} height={60} />
        </View>

        <View className="w-full gap-y-2">
          <CustomButton
            label="구글로 계속할래요"
            icon={<AntDesign name="google" size={20} color="#0D0D0E" />}
            color="#0D0D0E"
            backgroundColor="#F2F4F6"
            disabled={isLoggingIn}
            onPress={() => void handleOAuthLogin(getGoogleLogin)}
          />
          <CustomButton
            label="네이버로 계속할래요"
            icon={<NaverLogo width={20} height={20} />}
            color="#F7F7F8"
            backgroundColor="#03CF5D"
            disabled={isLoggingIn}
            onPress={() => void handleOAuthLogin(getNaverLogin)}
          />
          <CustomButton
            label="Apple로 로그인"
            icon={<AntDesign name="apple" size={20} color="#FFFFFF" />}
            color="#FFFFFF"
            backgroundColor="#000000"
            disabled={isLoggingIn}
            onPress={() => void handleOAuthLogin(getAppleLogin)}
          />
          <CustomButton
            label="아이디로 계속할래요"
            color="#0D0D0E"
            backgroundColor="#F8F8F8"
            disabled={isLoggingIn}
            onPress={() => router.replace("/auth/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
