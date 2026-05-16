import Top from "@/components/common/Top";
import { Pressable, Text, View, TouchableWithoutFeedback } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from "react";
import { router } from "expo-router";
import CustomButton from "@/components/common/CustomButton";

export default function Result() {
  const [isShowCard, setIsShowCard] = useState<boolean>(false);
  return (
    <View className="flex-1 bg-white">
      <Top title="자가진단"/>
      {isShowCard && (
        <TouchableWithoutFeedback onPress={() => setIsShowCard(false)}>
          <View className="absolute inset-0 z-10" />
        </TouchableWithoutFeedback>
      )}
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center justify-center flex-1">
          <Text className="color-[#5C5E5E] font-medium text-xl">내 레벨은?</Text>
          <View className="relative flex-row items-center gap-1 mt-3">
            <Text className="text-4xl font-bold">통화 경계형</Text>
            <Pressable onPress={() => setIsShowCard(prev => !prev)} className="cursor-pointer">
              <Ionicons name="help-circle" size={24} color="#BDBEBE" />
            </Pressable>
            {isShowCard && 
              <TouchableWithoutFeedback>
                <View className="absolute z-20 p-3 bg-white border rounded shadow-xl border-[#DADADB] min-h-20 w-60 top-8 right-4">
                  <Text>전화 통화 자체를 신경 쓰고 조심하게 되는 상태예요. 벨소리나 부재중 전화에도 스트레스를 느끼며, 예상치 못한 통화 상황을 부담스럽게 받아들이는 경우가 많습니다.</Text>
                </View>
              </TouchableWithoutFeedback>}
          </View>
          <View className="my-10 border border-[#EAEAEA] w-full" />
          <Text>모르는 번호로 걸려 온 전화를 받지 않는데 어려움을 느낍니다. 식당 예약이나 고객센터 문의와 같은 공적인 전화 상황에서 특히 긴장하거나 회피하는 부담을 느낍니다. 전화벨이 울릴 때 받아야 한다는 압박감으로 망설이게 되어 어려움을 느낍니다.</Text>
        </View>
        <CustomButton label="저장하고 홈으로 가기" onPress={() => router.push("/home")} backgroundColor="#0AE365" color="white"/>
      </View>
    </View>
  )
}