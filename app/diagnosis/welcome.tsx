import CustomButton from "@/components/common/CustomButton";
import { router } from "expo-router";
import { Text, View } from "react-native";
import type { TextStyle } from "react-native";
import PartyFace from "@/assets/partyFace.svg";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT_WEIGHT } from "@/design-system/typography";

export default function Welcome() {
  const insets = useSafeAreaInsets();

  useAndroidBackHandler(() => {
    router.replace("/auth/login");
    return true;
  });
  return (
    <View className="flex-col justify-between flex-1 p-10 bg-background-normal" style={{ paddingBottom: insets.bottom + 40 }}>
      <View className="mt-40">
        <PartyFace />
        <Text className="mt-6 text-title2" style={{ fontWeight: FONT_WEIGHT.bold as TextStyle["fontWeight"] }}>바다에 오신 것을 환영해요!</Text>
        <Text className="mt-2 text-body text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>간단한 자가진단을 통해 {"\n"} 나의 콜포비아 지수를 진단해보세요.</Text>
      </View>

      <CustomButton label="자가진단 시작하기" onPress={() => router.push("/diagnosis/question")} tone="primary" />
    </View>
  )
}
