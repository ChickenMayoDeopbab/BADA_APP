import GreenBtn from "@/components/common/GreenBtn";
import Top from "@/components/common/Top";
import { DIAGNOSIS } from "@/constants/diagnosis";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Text, View } from "react-native";

export default function Question() {
  const [nowStep, setNowStep] = useState<number>(0);

  const handleNext = () => {
    if (nowStep < 9) {
      setNowStep(prev => prev + 1);
    } else if (nowStep === 9) {
      router.push("/diagnosis/Loading")
    }
  }

  const handleBack = () => {
    if(nowStep > 0) {
      setNowStep(prev => prev - 1);
    } else if (nowStep === 0) {
      router.back();
    }
  }
  
  // 진행도 바 
  const PercentBar = ({step}:{step:number}) => {
    const percent = (step / 10) * 100;

    return (
      <View className="h-[18px] w-full rounded bg-[#EBEBEC] overflow-hidden">
        <View className="h-full rounded bg-[#0AE365]" style={{ width: `${percent}%` }}/>
      </View>
    )
  }
  
  return (
    <View className="flex-1 bg-white">
      <Top back={true} title="자가진단" onBack={handleBack}/>
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center w-full gap-3">
          <View className="flex-row justify-between w-full">
            <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아 자가진단</Text>
            <Text className="text-sm font-medium text-[#5C5E5E]">{nowStep+1}/10</Text>
          </View>
          <PercentBar step={nowStep+1}/>
          <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아는 누구나 겪을 수 있는 자연스러운 증상이에요.</Text>
        </View>
        <View className="flex-col items-center justify-center flex-1 gap-6">
          <Text className="text-2xl font-bold text-center">전화가 오면 바로 받지 않고 시간을 끌거나 끝내 받지 않은 적이 많다.</Text>
          <Image source={DIAGNOSIS[nowStep]} resizeMode="contain" className="w-[200px] h-[200px]" />
        </View>
        <View className="my-10 border border-[#EAEAEA]"/>
        <GreenBtn label="다음 문항" isDisabled={false} onClick={handleNext}/>
      </View>
    </View>
  )
}