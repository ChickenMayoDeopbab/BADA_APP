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
import { Alert, useWindowDimensions, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";

export default function AuthScreen() {
  useDoubleBackExit();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const bottomPadding = Math.min(Math.max(height * 0.1, 64), 96);

  const handleOAuthLogin = async (login: () => Promise<void>) => {
    try {
      await login();
    } catch {
      Alert.alert(
        "로그인 오류",
        "소셜 로그인 페이지를 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
      );
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
            onPress={() => void handleOAuthLogin(getGoogleLogin)}
          />
          <CustomButton
            label="네이버로 계속할래요"
            icon={<NaverLogo width={20} height={20} />}
            color="#F7F7F8"
            backgroundColor="#03CF5D"
            onPress={() => void handleOAuthLogin(getNaverLogin)}
          />
          <CustomButton
            label="Apple로 계속할래요"
            icon={<AntDesign name="apple" size={20} color="#F7F7F8" />}
            color="#F7F7F8"
            backgroundColor="#0D0D0E"
            onPress={() => void handleOAuthLogin(getAppleLogin)}
          />
          <CustomButton
            label="아이디로 계속할래요"
            color="#0D0D0E"
            backgroundColor="#F8F8F8"
            onPress={() => router.replace("/auth/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
