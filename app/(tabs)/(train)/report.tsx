import { getFeedback } from "@/api/recordApi";
import { FeedbackResponse } from "@/api/types";
import Clap from "@/assets/clap.svg";
import MagnifyingGlass from "@/assets/magnifyingGlass.svg";
import AudioSegmentButton from "@/components/audio/AudioSegmentButton";
import { AudioPlaybackGroupProvider } from "@/components/audio/AudioPlaybackGroup";
import CustomButton from "@/components/common/CustomButton";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Svg,
} from "react-native-svg";

type ReportParams = {
  scenarioId?: string;
  mode?: "scenario" | "warmUp";
};

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.04,
  shadowRadius: 5.3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

const MINIMUM_LOADING_TIME = 3000;
const FEEDBACK_AUDIO_HEIGHT = 88;

const wait = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration));

function ReportLoading() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const timing = { duration: 650, easing: Easing.inOut(Easing.sin) };
    translateX.value = withRepeat(
      withSequence(
        withTiming(-4, timing),
        withTiming(4, timing),
        withTiming(0, timing),
      ),
      -1,
      true,
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(4, timing),
        withTiming(-4, timing),
        withTiming(0, timing),
      ),
      -1,
      true,
    );
  }, [reducedMotion, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View className="items-center justify-center flex-1 bg-background-normal">
      <Animated.View style={animatedStyle}>
        <MagnifyingGlass width={84} height={84} />
      </Animated.View>
      <View className="items-center mt-10 gap-y-2">
        <Text className="font-bold text-center text-title2 text-label-normal">
          AI가 내 훈련 세션을{"\n"}분석하는 중이에요.
        </Text>
        <Text className="font-medium text-body text-label-alternative">
          잠시만 기다려 주세요.
        </Text>
      </View>
    </View>
  );
}

const formatTrainingTime = (trainingTime: FeedbackResponse["trainingTime"]) => {
  const [hours = "0", minutes = "0", seconds = "0"] =
    trainingTime.split(":");
  const parts: string[] = [];
  if (Number(hours) > 0) parts.push(`${Number(hours)}시간`);
  if (Number(minutes) > 0) parts.push(`${Number(minutes)}분`);
  parts.push(`${Number(seconds)}초`);
  return parts.join(" ");
};

const formatTimelineTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const keepWordsTogether = (text: string) =>
  text
    .split(" ")
    .map((word) => word.split("").join("\u2060"))
    .join(" ");

function FeedbackAudio({
  isExpanded,
  audioUrl,
  startTime,
  endTime,
}: {
  isExpanded: boolean;
  audioUrl: string;
  startTime: number;
  endTime: number;
}) {
  const [shouldRender, setShouldRender] = useState(isExpanded);
  const progress = useSharedValue(isExpanded ? 1 : 0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const animation = {
      duration: reducedMotion ? 0 : 220,
      easing: Easing.inOut(Easing.quad),
    };

    if (isExpanded) {
      setShouldRender(true);
      progress.value = withTiming(1, animation);
      return;
    }

    progress.value = withTiming(0, animation, (finished) => {
      if (finished) runOnJS(setShouldRender)(false);
    });
  }, [isExpanded, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: FEEDBACK_AUDIO_HEIGHT * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      pointerEvents={isExpanded ? "auto" : "none"}
      className="overflow-hidden"
      style={animatedStyle}
    >
      {shouldRender && (
        <View className="pt-4">
          <AudioSegmentButton
            audioUrl={audioUrl}
            startTime={startTime}
            endTime={endTime}
          />
        </View>
      )}
    </Animated.View>
  );
}

function SummaryBackground() {
  return (
    <Svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <LinearGradient
          id="reportSummary"
          x1="0"
          y1="100"
          x2="100"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
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
      <Rect width="100" height="100" fill="url(#reportSummary)" />
    </Svg>
  );
}

/**
 * 훈련 목록으로 돌아간다.
 * 훈련 스택은 list → detail → start → report 형태로 남아 있어서
 * replace를 쓰면 list가 하나 더 쌓이고 뒤로가기가 start·detail로 되돌아간다.
 * dismissTo는 스택을 list까지 되감고, list가 없으면 replace로 폴백한다.
 */
const goToList = () => router.dismissTo("/(tabs)/(train)/list");

function BottomFade() {
  return (
    <Svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <LinearGradient
          id="reportFade"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <Stop
            offset="0"
            stopColor={SEMANTIC_COLORS.background.alternative}
            stopOpacity="0"
          />
          <Stop
            offset="0.55"
            stopColor={SEMANTIC_COLORS.background.alternative}
          />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill="url(#reportFade)" />
    </Svg>
  );
}

export default function Report() {
  const { scenarioId, mode = "scenario" } = useLocalSearchParams<ReportParams>();
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndexes, setExpandedIndexes] = useState(
    () => new Set<number>([0]),
  );

  const finishReport = useCallback(() => {
    goToList();
  }, []);

  useAndroidBackHandler(() => {
    goToList();
    return true;
  });

  const fetchFeedback = useCallback(async () => {
    const parsedScenarioId = Number(scenarioId);
    if (!scenarioId || !Number.isSafeInteger(parsedScenarioId)) {
      setError("시나리오 정보를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [result] = await Promise.all([
        getFeedback({ scenarioId: parsedScenarioId }),
        wait(MINIMUM_LOADING_TIME),
      ]);
      setFeedback(result);
    } catch {
      setError("훈련 결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const toggleFeedback = (index: number) => {
    setExpandedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <AudioPlaybackGroupProvider>
      <SafeAreaView
        className="flex-1 bg-background-alternative"
        edges={["top"]}
      >
        {isLoading ? (
          <ReportLoading />
        ) : (
          <>
            <View className="items-center justify-center h-16">
              <Text className="font-bold text-headline1 text-label-neutral">
                훈련 리포트
              </Text>
            </View>
            {error || !feedback ? (
          <View className="items-center justify-center flex-1 px-10 gap-y-3">
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={SEMANTIC_COLORS.status.error}
            />
            <Text className="font-medium text-body text-label-neutral">
              {error ?? "훈련 결과 데이터가 비어 있습니다."}
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-2 bg-primary-normal rounded-control"
              onPress={fetchFeedback}
            >
              <Text className="font-bold text-common-0">재시도</Text>
            </TouchableOpacity>
          </View>
            ) : (
          <View className="relative flex-1">
            <View
              className="relative self-stretch h-32 mx-4 mt-[15px] overflow-hidden rounded-component"
            >
              <SummaryBackground />
              <View className="absolute left-[17px] top-4">
                <Clap width={60} height={60} />
              </View>
              <Text
                className="absolute bottom-4 left-[17px] max-w-[205px] font-bold text-title2 text-common-0"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                많이 좋아졌는걸요?
              </Text>

              <View className="absolute left-[94px] right-[17px] bottom-4 items-end gap-2">
                {mode === "scenario" && (
                  <View className="items-end">
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
                      {feedback.scenarioName}
                    </Text>
                  </View>
                )}
                <View className="items-end">
                  <Text
                    className="font-medium text-body"
                    style={{ color: `${PALETTE.common[0]}99` }}
                  >
                    {mode === "warmUp" ? "워밍업 시간" : "훈련시간"}
                  </Text>
                  <Text className="font-bold text-body text-common-0">
                    {formatTrainingTime(feedback.trainingTime)}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              className="flex-1 mt-5"
              contentContainerStyle={{ paddingBottom: 104 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="px-[33px]">
                <Text className="font-medium text-label text-label-alternative">
                  통화 타임라인
                </Text>

                {feedback.goodSegments.length === 0 ? (
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
                    {feedback.goodSegments.map((segment, index) => {
                      const isExpanded = expandedIndexes.has(index);
                      const isLast = index === feedback.goodSegments.length - 1;

                      return (
                        <View
                          key={`${segment.start}-${segment.end}-${index}`}
                          className="flex-row items-stretch"
                        >
                          <View className="items-center w-7 mr-[6px]">
                            <View
                              className="z-10 items-center justify-center w-7 h-7 border-[4px] rounded-full bg-background-alternative"
                              style={{ borderColor: PALETTE.green[40] }}
                            >
                              <View
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: PALETTE.green[40] }}
                              />
                            </View>
                            {!isLast && (
                              <View className="flex-1 w-0.5 mt-2 mb-1 bg-line-neutral" />
                            )}
                          </View>

                          <View className={`flex-1 ${isLast ? "" : "pb-4"}`}>
                            <Text className="h-7 font-medium text-headline2 text-label-neutral">
                              {formatTimelineTime(segment.start)}
                            </Text>
                            <View className="rounded-component" style={cardShadow}>
                              <View className="px-3 py-4 overflow-hidden bg-background-normal rounded-component">
                                <Pressable
                                  className="flex-row items-start justify-between"
                                  onPress={() => toggleFeedback(index)}
                                >
                                  <Text className="flex-1 pr-2 font-medium text-body text-label-neutral">
                                    {keepWordsTogether(segment.good_point)}
                                  </Text>
                                  <Ionicons
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={24}
                                    color={SEMANTIC_COLORS.line.normal}
                                  />
                                </Pressable>

                                <FeedbackAudio
                                  isExpanded={isExpanded}
                                  audioUrl={feedback.recordingUrl}
                                  startTime={segment.start}
                                  endTime={segment.end}
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            <View
              pointerEvents="box-none"
              className="absolute bottom-0 left-0 right-0 h-[148px] justify-end px-[33px] pb-6"
            >
              <BottomFade />
              <CustomButton
                label="저장하고 끝내기"
                backgroundColor={SEMANTIC_COLORS.primary.normal}
                onPress={finishReport}
              />
            </View>
          </View>
            )}
          </>
        )}
      </SafeAreaView>
    </AudioPlaybackGroupProvider>
  );
}
