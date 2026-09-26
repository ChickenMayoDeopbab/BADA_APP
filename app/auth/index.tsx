import { SEMANTIC_COLORS } from "@/design-system";
import BadaLogo from "@/assets/badaLogo2.svg";
import NaverLogo from "@/assets/naver.svg";
import CustomButton from "@/components/common/CustomButton";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router, type Href } from "expo-router";
import { useWindowDimensions, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";

export default function AuthScreen() {
  useDoubleBackExit();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const bottomPadding = Math.min(Math.max(height * 0.1, 64), 96);
  const openAgreement = (
    next: "login" | "google" | "naver" | "apple",
  ) => {
    router.push(`/auth/terms?next=${next}` as Href);
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
            icon={<AntDesign name="google" size={20} color={SEMANTIC_COLORS.label.normal} />}
            color={SEMANTIC_COLORS.label.normal}
            backgroundColor="#F2F4F6"
            onPress={() => openAgreement("google")}
          />
          <CustomButton
            label="네이버로 계속할래요"
            icon={<NaverLogo width={20} height={20} />}
            color="#F7F7F8"
            backgroundColor="#03CF5D"
            onPress={() => openAgreement("naver")}
          />
          <CustomButton
            label="Apple로 로그인"
            icon={<AntDesign name="apple" size={20} color="#FFFFFF" />}
            color="#FFFFFF"
            backgroundColor="#000000"
            onPress={() => openAgreement("apple")}
          />
          <CustomButton
            label="아이디로 계속할래요"
            tone="neutral"
            onPress={() => openAgreement("login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
