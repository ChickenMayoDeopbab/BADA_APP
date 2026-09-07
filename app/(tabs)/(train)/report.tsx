import { getTrainingFeedbackBySessionId } from "@/api/recordApi";
import { TrainingFeedbackResponse } from "@/api/types";
import Clap from "@/assets/clap.svg";
import { AudioPlaybackGroupProvider } from "@/components/audio/AudioPlaybackGroup";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import BestPart from "@/components/report/BestPart";
import SeekableAudioPlayer from "@/components/SeekableAudioPlayer";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";

type ReportParams = {
  sessionId?: string;
  scenarioId?: string;
  mode?: "scenario" | "warmUp";
  title?: string;
  content?: string;
  isCustom?: string;
  scenarioImage?: string;
  category?: string;
};

const formatTrainingTime = (
  trainingTime: TrainingFeedbackResponse["trainingTime"],
): string => {
  const parts: string[] = [];
  if (trainingTime.hour > 0) parts.push(`${trainingTime.hour}시간`);
  if (trainingTime.minute > 0) parts.push(`${trainingTime.minute}분`);
  parts.push(`${Math.round(trainingTime.second)}초`);
  return parts.join(" ");
};

export default function Report() {
  const {
    sessionId,
    scenarioId,
    mode = "scenario",
    title,
    content,
    isCustom,
    scenarioImage,
    category,
  } = useLocalSearchParams<ReportParams>();

  useAndroidBackHandler(() => {
    if (scenarioId) {
      router.replace({
        pathname: "/(tabs)/(train)/detail/[id]",
        params: { id: scenarioId, title, content, isCustom, scenarioImage, category },
      });
    } else {
      router.replace("/(tabs)/(train)/list");
    }
    return true;
  });
  const [feedback, setFeedback] = useState<TrainingFeedbackResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    if (!sessionId) {
      setError("세션 정보를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      setFeedback(
        await getTrainingFeedbackBySessionId(sessionId),
      );
    } catch {
      setError("훈련 결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return (
    <AudioPlaybackGroupProvider>
      <View className="flex-1 bg-white">
        <Top title="훈련 종료" />

        {isLoading ? (
          <View className="items-center justify-center flex-1 gap-y-3">
            <ActivityIndicator color="#0AE365" />
            <Text className="text-sm text-[#5C5E5E]">
              훈련 결과를 불러오는 중이에요.
            </Text>
          </View>
        ) : error || !feedback ? (
          <View className="items-center justify-center flex-1 px-10 gap-y-3">
            <Ionicons name="alert-circle-outline" size={48} color="#F65C5C" />
            <Text className="text-base font-medium text-[#3B3D3E]">
              {error ?? "훈련 결과 데이터가 비어 있습니다."}
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-2 rounded-lg bg-[#0AE365]"
              onPress={fetchFeedback}
            >
              <Text className="font-semibold text-white">재시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-10"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center pt-12">
              <Clap />
              <Text className="my-5 text-4xl font-bold text-[#3B3D3E]">
                수고하셨어요!
              </Text>
              {mode === "scenario" && (
                <Text className="mb-1 text-base font-medium text-[#3B3D3E]">
                  시나리오명{" "}
                  <Text className="font-bold">{feedback.scenarioName}</Text>
                </Text>
              )}
              <Text className="text-base font-medium text-[#3B3D3E]">
                {mode === "warmUp" ? "워밍업 시간" : "훈련시간"}{" "}
                <Text className="font-bold">
                  {formatTrainingTime(feedback.trainingTime)}
                </Text>
              </Text>
            </View>

            <View className="w-full bg-[#F5F5F5] rounded-2xl p-5 mt-10">
              <Text className="text-lg font-bold text-[#3B3D3E] mb-4">
                전체 녹음 듣기
              </Text>
              <SeekableAudioPlayer audioUrl={feedback.recordingUrl} />
            </View>

            <View className="w-full bg-[#F5F5F5] rounded-2xl p-5 mt-4">
              <Text className="text-lg font-bold text-[#3B3D3E]">
                이 부분이 좋았어요!
              </Text>
              <View className="w-full mt-4 gap-y-4">
                {feedback.goodSegments.length > 0 ? (
                  feedback.goodSegments.map((segment, index) => (
                    <BestPart
                      key={`${segment.start}-${segment.end}-${index}`}
                      summary={segment.good_point}
                      startTime={segment.start}
                      endTime={segment.end}
                      url={feedback.recordingUrl}
                    />
                  ))
                ) : (
                  <Text className="py-8 text-sm text-center text-[#8C8E8E]">
                    표시할 피드백 구간이 없습니다.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        <View className="px-10 pt-4 pb-10">
          <CustomButton
            label="끝내기"
            backgroundColor="#0AE365"
            color="white"
            onPress={() => router.replace("/(tabs)/(train)/list")}
          />
        </View>
      </View>
    </AudioPlaybackGroupProvider>
  );
}
