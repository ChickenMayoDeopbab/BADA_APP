import Top from "@/components/common/Top";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import CustomButton from "@/components/common/CustomButton";
import Clap from "@/assets/clap.svg";
import { router, useLocalSearchParams } from "expo-router";
import { Feedback } from "@/api/types";
import { getFeedback } from "@/api/trainApi";
import BestPart from "@/components/report/BestPart";

export default function Report() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await getFeedback(scenarioId);
        setFeedback(response);
      } catch {}
    }

    fetchFeedback();
  }, [])
  
  return (
    <View className="flex-1 bg-white">
      <Top title="훈련 종료"/>
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center justify-center flex-1">
          <Clap />
          <Text className="my-5 text-4xl font-bold">수고하셨어요!</Text>
          {feedback?.sessionType === 'scenario'  
            ? <>
                <Text className="mb-1 text-base font-medium">시나리오명 <Text className="font-bold">{feedback?.scenarioName}</Text></Text>
                <Text className="text-base font-medium">훈련시간 <Text className="font-bold">{feedback?.trainingTime.hour && feedback?.trainingTime.hour+'시간'} {feedback?.trainingTime.minute ?? 0} 분 {feedback?.trainingTime.second ?? 0} 초</Text></Text>
              </>
            : <Text className="text-base font-medium">워밍업 시간 <Text className="font-bold">{feedback?.trainingTime.hour && feedback?.trainingTime.hour+'시간'} {feedback?.trainingTime.minute ?? 0} 분 {feedback?.trainingTime.second ?? 0} 초</Text></Text>
          }
          <View className="w-full bg-[#F5F5F5] h-80 rounded-2xl p-5 mt-10">
            <Text className="text-lg font-bold">다시 한 번 들어볼까요?</Text>
            <View className="flex-col flex-1 w-full gap-4 mt-4">
              {feedback?.goodSegments.map((f, index) => (
                  <BestPart key={index} summary={f.good_point} startTime={f.start} endTime={f.end} url={feedback.recordingUrl}/>
                ))
              }
            </View>
          </View>
        </View>
        <CustomButton label="끝내기" backgroundColor="#0AE365" color="white" onPress={() => router.replace("/(tabs)/(train)/list")}/>
      </View>
    </View>
  )
}