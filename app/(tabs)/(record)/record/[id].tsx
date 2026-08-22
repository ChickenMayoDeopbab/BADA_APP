import AudioSegmentButton from "@/components/audio/AudioSegmentButton";
import { AudioPlaybackGroupProvider } from "@/components/audio/AudioPlaybackGroup";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useTrainingRecordDetail } from "@/hooks/useTrainingRecordDetail";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type DetailParams = { id: string };

const cardShadow = {
  shadowColor: SEMANTIC_COLORS.label.strong,
  shadowOpacity: 0.08,
  shadowRadius: 5.3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
};

const formatTimelineTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

function SummaryBackground() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <Defs>
        <LinearGradient id="recordSummary" x1="0" y1="0" x2="1" y2="1">
          <Stop
            offset="0"
            stopColor={SEMANTIC_COLORS.record.summaryGradientStart}
          />
          <Stop
            offset="1"
            stopColor={SEMANTIC_COLORS.record.summaryGradientEnd}
          />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#recordSummary)" />
    </Svg>
  );
}

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<DetailParams>();
  const recordId = Number(id);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [expandedFeedbackIndex, setExpandedFeedbackIndex] = useState<
    number | null
  >(null);
  const { data, isLoading, isError, refetch } =
    useTrainingRecordDetail(recordId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/record");
  };

  useAndroidBackHandler(() => {
    goBack();
    return true;
  });

  return (
    <AudioPlaybackGroupProvider>
      <SafeAreaView
        className="flex-1 bg-background-alternative"
        edges={["top"]}
      >
        <View className="z-20 flex-row items-center justify-between h-16 px-2 bg-background-alternative">
          <TouchableOpacity
            className="items-center justify-center w-16 h-16"
            onPress={goBack}
          >
            <Ionicons
              name="chevron-back"
              size={32}
              color={SEMANTIC_COLORS.label.alternative}
            />
          </TouchableOpacity>

          <Text className="font-bold text-headline1 text-label-neutral">
            훈련 기록
          </Text>

          <TouchableOpacity
            className="items-center justify-center w-16 h-16"
            onPress={() => setIsMenuVisible((visible) => !visible)}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={26}
              color={SEMANTIC_COLORS.label.normal}
            />
          </TouchableOpacity>

          {isMenuVisible && (
            <View
              className="absolute right-4 top-[53px] z-30 w-40 h-[52px] overflow-hidden bg-background-normal rounded-component"
              style={{
                shadowColor: SEMANTIC_COLORS.label.strong,
                shadowOpacity: 0.12,
                shadowRadius: 4.3,
                shadowOffset: { width: 0, height: 0 },
                elevation: 5,
              }}
            >
              <Pressable
                className="justify-center flex-1 px-3"
                onPress={() => setIsMenuVisible(false)}
              >
                <Text className="font-medium text-headline2 text-label-normal">
                  기록 삭제하기
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {isLoading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator color={SEMANTIC_COLORS.primary.normal} />
          </View>
        ) : isError || !data ? (
          <View className="items-center justify-center flex-1 px-8">
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={SEMANTIC_COLORS.status.error}
            />
            <Text className="mt-3 font-medium text-body text-label-neutral">
              불러오기 실패
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-4 bg-primary-normal rounded-control"
              onPress={() => refetch()}
            >
              <Text className="font-bold text-label text-label-buttonText">
                재시도
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            onScrollBeginDrag={() => setIsMenuVisible(false)}
          >
            <View
              className="relative h-[124px] mx-4 mt-[15px] overflow-hidden rounded-component"
              style={cardShadow}
            >
              <SummaryBackground />
              <View className="justify-between flex-1 px-[17px] py-4">
                <View>
                  <Text
                    className="font-medium text-body"
                    style={{ color: `${PALETTE.common[0]}99` }}
                  >
                    시나리오명
                  </Text>
                  <Text
                    className="font-bold text-body text-common-0"
                    numberOfLines={1}
                  >
                    {data.scenarioName}
                  </Text>
                </View>
                <View>
                  <Text
                    className="font-medium text-body"
                    style={{ color: `${PALETTE.common[0]}99` }}
                  >
                    훈련시간
                  </Text>
                  <Text className="font-bold text-body text-common-0">
                    {formatDuration(data.durationSeconds)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="px-[33px] mt-5">
              <Text className="font-medium text-label text-label-alternative">
                통화 타임라인
              </Text>

              {data.positiveFeedbacks.length === 0 ? (
                <View className="items-center py-16">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={44}
                    color={SEMANTIC_COLORS.line.normal}
                  />
                  <Text className="mt-3 text-center text-body text-label-alternative">
                    제공된 피드백이 없습니다
                  </Text>
                </View>
              ) : (
                <View className="mt-[10px]">
                  {data.positiveFeedbacks.map((feedback, index) => {
                    const isExpanded = expandedFeedbackIndex === index;
                    const isLast = index === data.positiveFeedbacks.length - 1;

                    return (
                      <View
                        key={`${feedback.startSecond}-${feedback.endSecond}-${index}`}
                        className="flex-row items-stretch"
                      >
                        <View className="items-center w-7 mr-[6px]">
                          <View className="z-10 items-center justify-center w-7 h-7 border-[4px] border-primary-normal rounded-full bg-background-alternative">
                            <View className="w-3 h-3 rounded-full bg-primary-normal" />
                          </View>
                          {!isLast && (
                            <View className="flex-1 w-0.5 bg-line-neutral" />
                          )}
                        </View>

                        <View className={`flex-1 ${isLast ? "" : "pb-4"}`}>
                          <Text className="h-7 font-medium text-headline2 text-label-neutral">
                            {formatTimelineTime(feedback.startSecond)}
                          </Text>
                          <TouchableOpacity
                            className="px-3 py-4 bg-background-normal rounded-component"
                            style={cardShadow}
                            activeOpacity={0.8}
                            onPress={() =>
                              setExpandedFeedbackIndex(isExpanded ? null : index)
                            }
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="flex-1 pr-2 font-medium text-body text-label-neutral">
                                {feedback.good_point}
                              </Text>
                              <Ionicons
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={24}
                                color={SEMANTIC_COLORS.line.normal}
                              />
                            </View>

                            {isExpanded && (
                              <View className="pt-3 mt-3 border-t border-line-alternative">
                                {feedback.summary ? (
                                  <Text className="mb-3 text-label text-label-alternative">
                                    {feedback.summary}
                                  </Text>
                                ) : null}
                                <View className="items-start">
                                  <AudioSegmentButton
                                    audioUrl={data.recordingUrl}
                                    startTime={feedback.startSecond}
                                    endTime={feedback.endSecond}
                                  />
                                </View>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </AudioPlaybackGroupProvider>
  );
}
