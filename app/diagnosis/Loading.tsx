import { Image, Text, View } from "react-native";

export default function Loading() {
  
  
  return (
    <View className="flex-col items-center justify-center flex-1 p-10 bg-white">
      <Image source={require("@/assets/sandClock.png")} resizeMode="contain" />
      <Text className="text-2xl font-bold mb-[10px] mt-[30px]">콜포비아 레벨을 계산 중이에요.</Text>
      <Text className="color-[#5C5E5E] font-medium text-base">잠시만 기다려 주세요.</Text>
    </View>
  )
}