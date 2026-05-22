import CustomButton from "@/components/common/CustomButton";
import { router } from "expo-router";
import { Text, View } from "react-native";
import PartyFace from "@/assets/partyFace.svg";

export default function Welcome() {
  return (
    <View className="flex-col justify-between flex-1 p-10 bg-white">
      <View className="mt-40">
        <PartyFace />
        <Text className="mt-6 text-2xl font-bold">바다에 오신 것을 환영해요!</Text>
        <Text className="text-base font-medium text-[#5C5E5E] mt-2">간단한 자가진단을 통해 {"\n"} 나의 콜포비아 지수를 진단해보세요.</Text>
      </View>

      <CustomButton label="자가진단 시작하기" onPress={() => router.push("/diagnosis/question")} backgroundColor="#0AE365" color="white"/>
    </View>
  )
}