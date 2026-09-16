import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from "react-native-reanimated";
import AnimatedCheck from "./AnimatedCheck";
import Top from "@/components/common/Top";
import SandClock from "@/assets/sandClock.svg";

// 서버 응답 대기 타입
type Status = "loading" | "done" | "error";

interface LoadingProps {
  status?: Status;
  title?: string;
  loadingText?: string;
  loadingSubText?: string;
  doneText?: string;
  doneSubText?: string;
  errorText?: string;
  errorSubText?: string;
}

export default function Loading({
  status,
  title ,
  loadingText,
  loadingSubText,
  doneText,
  doneSubText,
  errorText,
  errorSubText,
}: LoadingProps) {
  const rotation = useSharedValue(0);

  // 모래시계 돌리기
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

  // 상태에 따라 다른 오브젝트 출력
  const renderContent = () => {
    if (status === "loading") {
      return (
        <>
          <Animated.View style={animatedStyle}>
            <SandClock />
          </Animated.View>
          <Text className="text-title2 font-bold mb-[10px] mt-[30px]">
            {loadingText}
          </Text>
          <Text className="text-label-alternative font-medium text-body">
            {loadingSubText}
          </Text>
        </>
      );
    }

    if (status === "done") {
      return (
        <>
          <AnimatedCheck />
          <Text className="text-title2 font-bold mb-[10px] mt-[30px]">
            {doneText}
          </Text>
          <Text className="text-label-alternative font-medium text-body">
            {doneSubText}
          </Text>
        </>
      );
    }

    if (status === "error") {
      return (
        <>
          <Image source={require("@/assets/sadFace.gif")} style={{ width: 90, height: 90 }} />
          <Text className="text-title2 font-bold mb-[10px] mt-[30px]">
            {errorText}
          </Text>
          <Text className="text-label-alternative font-medium text-body">
            {errorSubText}
          </Text>
        </>
      );
    }
  };

  return (
    <View className="flex-1 px-[33px] bg-background-normal">
      <Top title={title} />
      <View className="flex-col items-center justify-center flex-1 mb-[105px]">
        {renderContent()}
      </View>
    </View>
  );
}
