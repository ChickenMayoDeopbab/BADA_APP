import BadaLogo from "@/assets/badaLogo2.svg";
import NaverLogo from "@/assets/naver.svg";
import CustomButton from "@/components/common/CustomButton";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthScreen() {
  return (
    <SafeAreaView className="flex-1">
      <View className="items-center justify-between flex-1 px-8 pb-24">
        <View className="justify-center flex-1">
          <BadaLogo width={125} />
        </View>

        <View className="w-full gap-y-2">
          <CustomButton
            label="구글로 계속할래요"
            icon={<AntDesign name="google" size={20} color="#0D0D0E" />}
            color="#0D0D0E"
            backgroundColor="#F2F4F6"
          />
          <CustomButton
            label="네이버로 계속할래요"
            icon={<NaverLogo width={20} height={20} />}
            color="#F7F7F8"
            backgroundColor="#03CF5D"
          />
          <CustomButton
            label="Apple로 계속할래요"
            icon={<AntDesign name="apple" size={20} color="#F7F7F8" />}
            color="#F7F7F8"
            backgroundColor="#0D0D0E"
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
