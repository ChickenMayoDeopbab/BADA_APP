import { checkAttendance } from "@/api/AttendanceApi";
import { FeedbackWaitTimeoutError, waitForFeedback } from "@/api/recordApi";
import { FeedbackResponse } from "@/api/types";
import Clap from "@/assets/clap.svg";
import MagnifyingGlass from "@/assets/magnifyingGlass.svg";
import AudioSegmentButton from "@/components/audio/AudioSegmentButton";
import { AudioPlaybackGroupProvider } from "@/components/audio/AudioPlaybackGroup";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { FONT_WEIGHT, PALETTE, SEMANTIC_COLORS } from "@/design-system";
import { SUBTLE_CARD_SHADOW } from "@/design-system/effects";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { getCompletedCallDuration } from "@/utils/completedCallDuration";
import { getFeedbackHighlightText } from "@/utils/feedbackHighlight";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { isCancel } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
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
import { Defs, LinearGradient, Rect, Stop, Svg } from "react-native-svg";

type ReportParams = {
  scenarioId?: string;
  sessionId?: string;
  callDurationSeconds?: string;
  mode?: "scenario" | "warmUp";
};

const reportTextStyles = StyleSheet.create({
  regular: {
    fontWeight: FONT_WEIGHT.regular as TextStyle["fontWeight"],
  },
  medium: {
    fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"],
  },
  bold: {
    fontWeight: FONT_WEIGHT.bold as TextStyle["fontWeight"],
  },
});

const FEEDBACK_AUDIO_HEIGHT = 88;

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
        <Text
          className="text-center text-title2 text-label-normal"
          style={reportTextStyles.bold}
        >
          AI가 내 훈련 세션을{"\n"}분석하는 중이에요.
        </Text>
        <Text
          className="text-body text-label-alternative"
          style={reportTextStyles.medium}
        >
          잠시만 기다려 주세요.
        </Text>
      </View>
    </View>
  );
}

const formatTrainingTime = (trainingTime: FeedbackResponse["trainingTime"]) => {
  const [hours = "0", minutes = "0", seconds = "0"] = trainingTime.split(":");
  const parts: string[] = [];
  if (Number(hours) > 0) parts.push(`${Number(hours)}시간`);
  if (Number(minutes) > 0) parts.push(`${Number(minutes)}분`);
  parts.push(`${Number(seconds)}초`);
  return parts.join(" ");
};

const trainingTimeFromSeconds = (totalSeconds: number) => {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
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

function FeedbackDetails({
  isExpanded,
  audioUrl,
  startTime,
  endTime,
  content,
}: {
  isExpanded: boolean;
  audioUrl: string;
  startTime: number;
  endTime: number;
  content: string;
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
    <View>
      {isExpanded && content ? (
        <Text className="mt-3 text-body text-label-alternative" style={reportTextStyles.regular}>
          {content}
        </Text>
      ) : null}
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
    </View>
  );
}

function SummaryBackground() {
  return (
    <Svg
      width="100%"
      height="100%"
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
const goToHome = () => router.dismissTo("/(tabs)/(home)/home");

export default function Report() {
  const { width, fontScale } = useWindowDimensions();
  const isCompactSummary = width < 380 || fontScale > 1.2;

  const {
    scenarioId,
    sessionId,
    callDurationSeconds,
    mode = "scenario",
  } = useLocalSearchParams<ReportParams>();
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisDelayed, setIsAnalysisDelayed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedbackRequestRef = useRef<AbortController | null>(null);
  const [expandedIndexes, setExpandedIndexes] = useState(
    () => new Set<number>([]),
  );

  const finishReport = useCallback(() => {
    goToList();
  }, []);

  useAndroidBackHandler(() => {
    goToList();
    return true;
  });

  const fetchFeedback = useCallback(async () => {
    feedbackRequestRef.current?.abort();
    const controller = new AbortController();
    feedbackRequestRef.current = controller;
    setIsAnalysisDelayed(false);
    const parsedScenarioId = Number(scenarioId);
    if (!scenarioId || !Number.isSafeInteger(parsedScenarioId) || parsedScenarioId <= 0) {
      setError("시나리오 정보를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await waitForFeedback(
        { scenarioId: parsedScenarioId },
        { signal: controller.signal },
      );
      const routeDuration = Number(callDurationSeconds);
      const completedDuration =
        callDurationSeconds !== undefined &&
        Number.isSafeInteger(routeDuration) &&
        routeDuration >= 0
          ? routeDuration
          : await getCompletedCallDuration(sessionId);
      if (controller.signal.aborted) return;
      setFeedback(
        completedDuration === null
          ? result
          : {
              ...result,
              trainingTime: trainingTimeFromSeconds(completedDuration),
            },
      );
      void checkAttendance().catch(() => {});
    } catch (error) {
      if (controller.signal.aborted || isCancel(error)) return;
      setIsAnalysisDelayed(error instanceof FeedbackWaitTimeoutError);
      setError(error instanceof FeedbackWaitTimeoutError
        ? error.message
        : "훈련 결과를 불러오지 못했습니다.");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [callDurationSeconds, scenarioId, sessionId]);

  useEffect(() => {
    void fetchFeedback();
    return () => {
      feedbackRequestRef.current?.abort();
    };
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
        edges={["top", "bottom"]}
      >
        {isLoading || isAnalysisDelayed ? (
          <View className="flex-1 bg-background-normal">
            <ReportLoading />
            {isAnalysisDelayed && (
              <View className="gap-3 px-[33px] pb-6">
                <Text className="text-center text-label text-label-alternative">
                  {error}
                </Text>
                <CustomButton label="재시도" onPress={fetchFeedback} tone="primary" />
                <CustomButton label="홈으로 돌아가기" onPress={goToHome} tone="neutral" />
              </View>
            )}
          </View>
        ) : (
          <>
            <Top title="훈련 리포트" safeArea={false} />
            {error || !feedback ? (
              <View className="items-center justify-center flex-1 px-10 gap-y-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={SEMANTIC_COLORS.status.error}
                />
                <Text
                  className="text-body text-label-neutral"
                  style={reportTextStyles.medium}
                >
                  {error ?? "훈련 결과 데이터가 비어 있습니다."}
                </Text>
                <View className="mt-2 w-[140px] gap-y-2">
                  <CustomButton
                    label="재시도"
                    tone="primary"
                    variant="md"
                    onPress={fetchFeedback}
                  />
                  <CustomButton
                    label="홈으로 돌아가기"
                    tone="neutral"
                    variant="md"
                    onPress={goToHome}
                  />
                </View>
              </View>
            ) : (
              <View className="relative flex-1">
                <ScrollView
                  className="flex-1"
                  contentContainerClassName="pb-6"
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    className="relative mx-[16px] mt-[15px] min-h-[127px] overflow-hidden rounded-component"
                  >
                    <SummaryBackground />
                    <View
                      className={`gap-[16px] p-[16px] ${isCompactSummary ? "" : "flex-row"}`}
                    >
                      <View
                        className={`min-w-0 ${isCompactSummary ? "flex-row items-center gap-3" : "flex-[2] gap-1"}`}
                      >
                        <Clap
                          width={isCompactSummary ? 48 : 60}
                          height={isCompactSummary ? 48 : 60}
                        />
                        <Text
                          className={`text-title2 text-common-0 ${isCompactSummary ? "min-w-0 flex-1" : ""}`}
                          style={reportTextStyles.bold}
                        >
                          많이 좋아졌는걸요?
                        </Text>
                      </View>
                      <View
                        className={`min-w-0 gap-2 ${isCompactSummary ? "flex-row" : "flex-1 items-end"}`}
                      >
                        {mode === "scenario" && (
                          <View
                            className={`min-w-0 ${isCompactSummary ? "flex-1" : "w-full items-end"}`}
                          >
                            <Text
                              className="text-body text-common-0 opacity-60"
                              style={reportTextStyles.medium}
                            >
                              시나리오명
                            </Text>
                            <Text
                              numberOfLines={2}
                              className={`w-full text-body text-common-0 ${isCompactSummary ? "" : "text-right"}`}
                              style={reportTextStyles.bold}
                            >
                              {feedback.scenarioName}
                            </Text>
                          </View>
                        )}
                        <View
                          className={`min-w-0 items-end ${isCompactSummary ? "flex-1" : "w-full"}`}
                        >
                          <Text
                            className="text-right text-body text-common-0 opacity-60"
                            style={reportTextStyles.medium}
                          >
                            {mode === "warmUp" ? "워밍업 시간" : "훈련시간"}
                          </Text>
                          <Text
                            className="w-full text-right text-body text-common-0"
                            style={reportTextStyles.bold}
                          >
                            {formatTrainingTime(feedback.trainingTime)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="mt-5 px-[33px]">
                    <Text
                      className="text-label text-label-alternative"
                      style={reportTextStyles.medium}
                    >
                      통화 타임라인
                    </Text>

                    {feedback.goodSegments.length === 0 ? (
                      <View className="items-center py-16">
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={44}
                          color={SEMANTIC_COLORS.line.normal}
                        />
                        <Text
                          className="mt-3 text-center text-body text-label-alternative"
                          style={reportTextStyles.regular}
                        >
                          제공된 피드백이 없습니다
                        </Text>
                      </View>
                    ) : (
                      <View className="mt-[10px]">
                        {feedback.goodSegments.map((segment, index) => {
                          const highlight = getFeedbackHighlightText(segment);
                          const isExpanded = expandedIndexes.has(index);
                          const isLast =
                            index === feedback.goodSegments.length - 1;

                          return (
                            <View
                              key={`${segment.start}-${segment.end}-${index}`}
                              className="flex-row items-stretch"
                            >
                              <View className="items-center w-7 mr-[6px]">
                                <View
                                  className="z-10 items-center justify-center w-7 h-7 border-[4px] rounded-pill bg-background-alternative"
                                  style={{ borderColor: PALETTE.green[40] }}
                                >
                                  <View
                                    className="w-3 h-3 rounded-pill"
                                    style={{
                                      backgroundColor: PALETTE.green[40],
                                    }}
                                  />
                                </View>
                                {!isLast && (
                                  <View className="flex-1 w-0.5 mt-2 mb-1 bg-line-neutral" />
                                )}
                              </View>

                              <View
                                className={`flex-1 ${isLast ? "" : "pb-4"}`}
                              >
                                <Text
                                  className="min-h-7 text-headline2 text-label-neutral"
                                  style={reportTextStyles.medium}
                                >
                                  {formatTimelineTime(segment.start)}
                                </Text>
                                <View
                                  className="rounded-component"
                                  style={SUBTLE_CARD_SHADOW}
                                >
                                  <View className="px-3 py-4 overflow-hidden bg-background-normal rounded-component">
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityState={{ expanded: isExpanded }}
                                      className="flex-row items-start justify-between"
                                      onPress={() => toggleFeedback(index)}
                                    >
                                      <Text
                                        className="flex-1 pr-2 text-body text-label-neutral"
                                        style={isExpanded ? reportTextStyles.bold : reportTextStyles.medium}
                                      >
                                        {keepWordsTogether(highlight.title)}
                                      </Text>
                                      <Ionicons
                                        name={
                                          isExpanded
                                            ? "chevron-up"
                                            : "chevron-down"
                                        }
                                        size={24}
                                        color={SEMANTIC_COLORS.line.normal}
                                      />
                                    </Pressable>

                                    <FeedbackDetails
                                      isExpanded={isExpanded}
                                      audioUrl={feedback.recordingUrl}
                                      startTime={segment.start}
                                      endTime={segment.end}
                                      content={highlight.content}
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
                  className="shrink-0 px-[33px] pt-3 pb-6"
                >
                  <CustomButton
                    label="저장하고 끝내기"
                    onPress={finishReport}
                    tone="primary"
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
