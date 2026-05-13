import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import AnimatedCheck from "./AnimatedCheck";
import Top from "@/components/common/Top";

type status = 'loading' | 'done';

export default function Loading() {
  const rotation = useSharedValue(0);
  const [status, setStatus] = useState<status>('loading');

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(180, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(180, { duration: 500, easing: Easing.linear }),
        withTiming(360, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(360, { duration: 300, easing: Easing.linear }),
      ),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}]
  }))
  
  return (
    <View className="flex-1 px-10 bg-white">
      <Top title="자가진단"/>
      <View className="flex-col items-center justify-center flex-1 mb-[105px]">
        {status === 'loading' 
          ? <>
              <Animated.Image source={require("@/assets/sandClock.svg")} style={animatedStyle} />
              <Text className="text-2xl font-bold mb-[10px] mt-[30px]">콜포비아 레벨을 계산 중이에요.</Text>
              <Text className="color-[#5C5E5E] font-medium text-base">잠시만 기다려 주세요.</Text>
            </>
          : <>
              <AnimatedCheck/>
              <Text className="text-2xl font-bold mb-[10px] mt-[30px]">콜포비아 레벨의 계산이 끝났어요.</Text>
              <Text className="color-[#5C5E5E] font-medium text-base">함께 결과를 확인해볼까요?</Text>
            </>}
      </View>
    </View>
  )
}