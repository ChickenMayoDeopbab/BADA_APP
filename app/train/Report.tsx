import Top from "@/components/common/Top";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomButton from "@/components/common/CustomButton";

type mode = 'scenario' | 'warmUp';

export default function Report() {
  const [mode, setMode] = useState<mode>('scenario');
  
  return (
    <View className="flex-1 bg-white">
      <Top title="훈련 종료"/>
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center justify-center flex-1">
          <Image source={require("@/assets/clap.svg")} resizeMode="contain"/>
          <Text className="my-5 text-4xl font-bold">수고하셨어요!</Text>
          {mode === 'scenario' 
            ? <>
                <Text className="mb-1 text-base font-medium">시나리오명 <Text className="font-bold">피자 주문하기</Text></Text>
                <Text className="text-base font-medium">훈련시간 <Text className="font-bold">2분 13초</Text></Text>
              </>
            : <Text className="text-base font-medium">워밍업 시간 <Text className="font-bold">2분 13초</Text></Text>
          }
          <View className="w-full bg-[#F5F5F5] h-80 rounded-2xl p-5 mt-20">
            <Text className="text-lg font-bold">이 부분이 좋았어요!</Text>
            <View className="flex-col flex-1 w-full gap-4 mt-4">
              <View className="flex-row items-center justify-between flex-1 p-3 bg-white rounded-xl">
                <View className="flex-col gap-1 ml-[10px]">
                  <Text className="text-xs font-medium">좋았던 내용 요약 정리</Text>
                  <Text className="color-[#BDBEBE] font-medium text-xs">00:00 ~ 00:00</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="play-circle-sharp" size={40} color="#0AE365" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center justify-between flex-1 p-3 bg-white rounded-xl">
                <View className="flex-col gap-1 ml-[10px]">
                  <Text className="text-xs font-medium">좋았던 내용 요약 정리</Text>
                  <Text className="color-[#BDBEBE] font-medium text-xs">00:00 ~ 00:00</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="play-circle-sharp" size={40} color="#0AE365" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center justify-between flex-1 p-3 bg-white rounded-xl">
                <View className="flex-col gap-1 ml-[10px]">
                  <Text className="text-xs font-medium">좋았던 내용 요약 정리</Text>
                  <Text className="color-[#BDBEBE] font-medium text-xs">00:00 ~ 00:00</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="play-circle-sharp" size={40} color="#0AE365" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        <CustomButton label="끝내기" />
      </View>
    </View>
  )
}