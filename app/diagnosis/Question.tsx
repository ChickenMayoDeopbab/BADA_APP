import GreenBtn from "@/components/common/GreenBtn";
import Top from "@/components/common/Top";
import { DIAGNOSIS } from "@/constants/diagnosis";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type RadioSize = 'sm' | 'lg';
type RadioOption = {
  value: number;
  size?: RadioSize; 
}
type RadioProps = {
  options: RadioOption[];
  value: number;
  onChange: (value: number) => void;
}

const ACTIVE_COLOR = '#0AE365';
const INACTIVE_COLOR = '#DADADB';

const CheckBtns = ({ options, value, onChange }: RadioProps) => {
  return (
    <>
      <View className="flex-row items-center justify-between px-2">
        {options.map((option) => {
          const isActive = value === option.value;
          const outerSize = option.size === 'lg' ? 50 : 40;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              className="items-center gap-1.5"
            >
              <View
                style={{
                  width: outerSize,
                  height: outerSize,
                  borderRadius: outerSize / 2,
                  borderWidth: 5,
                  borderColor: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View className="flex-row items-center justify-between px-2.5 mt-2">
        <Text className="text-sm text-[#5C5E5E] font-medium">전혀 없다</Text>
        <Text className="text-sm text-[#5C5E5E] font-medium">보통이다</Text>
        <Text className="text-sm text-[#5C5E5E] font-medium">자주 있다</Text>
      </View>
    </>
  );
};

export default function Question() {
  const [nowStep, setNowStep] = useState<number>(0);
  const [answer, setAnswer] = useState<number>(3);

  const handleNext = () => {
    if (nowStep < 9) {
      setNowStep(prev => prev + 1);
    } else {
      router.push("/diagnosis/Loading");
    }
  };

  const handleBack = () => {
    if (nowStep > 0) {
      setNowStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const PercentBar = ({ step }: { step: number }) => {
    const percent = (step / 10) * 100;
    return (
      <View className="h-[18px] w-full rounded bg-[#EBEBEC] overflow-hidden">
        <View className="h-full rounded bg-[#0AE365]" style={{ width: `${percent}%` }} />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Top back={true} title="자가진단" onBack={handleBack} />
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center w-full gap-3">
          <View className="flex-row justify-between w-full">
            <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아 자가진단</Text>
            <Text className="text-sm font-medium text-[#5C5E5E]">{nowStep + 1}/10</Text>
          </View>
          <PercentBar step={nowStep + 1} />
          <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아는 누구나 겪을 수 있는 자연스러운 증상이에요.</Text>
        </View>
        <View className="flex-col items-center justify-center flex-1 gap-6">
          <Text className="text-2xl font-bold text-center">
            전화가 오면 바로 받지 않고 시간을 끌거나 끝내 받지 않은 적이 많다.
          </Text>
          <Image source={DIAGNOSIS[nowStep]} resizeMode="contain" className="w-[200px] h-[200px]" />
        </View>
        <CheckBtns
          options={[
            { value: 1, size: 'lg' },
            { value: 2, size: 'sm' },
            { value: 3, size: 'sm' },
            { value: 4, size: 'sm' },
            { value: 5, size: 'lg' },
          ]}
          value={answer}
          onChange={setAnswer}
        />
        <View className="my-10 border border-[#EAEAEA]" />
        <GreenBtn label="다음 문항" isDisabled={false} onClick={handleNext} />
      </View>
    </View>
  );
}