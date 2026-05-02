import GreenBtn from "@/components/common/GreenBtn";
import { Image, Text, View } from "react-native";

export default function Welcome() {
  return (
    <View className="flex-col justify-between flex-1 p-10 bg-white">
      <View className="mt-40">
        <Image source={require("@/assets/partyFace.png")} resizeMode="contain" />
        <Text className="mt-6 text-2xl font-bold">바다에 오신 것을 환영해요!</Text>
        <Text className="text-base font-medium text-[#5C5E5E] mt-2">간단한 자가진단을 통해 {"\n"} 나의 콜포비아 지수를 진단해보세요.</Text>
      </View>

      <GreenBtn label="자가진단 시작하기" isDisabled={true}/>
    </View>
  )
}