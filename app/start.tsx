import { createSession } from "@/api/trainApi";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import MinuteRangePicker from "@/components/train/MinuteRangePicker";
import StepProgress from "@/components/train/StepProgress";
import StepSlider from "@/components/train/StepSlider";
import TrainingSettingTitle from "@/components/train/TrainingSettingTitle";
import {
  ATTITUDE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_MAP,
  SPRING_PERSONALITY_MAP,
} from "@/constants/train";
import {
  cancelTrainingCallSchedule,
  createTrainingCallSchedule,
} from "@/api/trainingCallApi";
import { saveTrainingCallScenario, removeTrainingCallScenario } from "@/utils/trainingCallScenario";
import { getApiErrorMessage } from "@/api/error";
import { useAppAlert } from "@/context/AppAlertContext";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useSensitiveConsentGuard } from "@/hooks/useSensitiveConsentGuard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FlowStep = "difficulty" | "time";

const FLOW_STEPS: FlowStep[] = ["difficulty", "time"];

export default function Start() {
  const insets = useSafeAreaInsets();
  const ensureSensitiveConsent = useSensitiveConsentGuard();
  const { id, isCustom, title, content, scenarioImage, category } =
    useLocalSearchParams<{
      id?: string;
      isCustom?: string;
      title?: string;
      content?: string;
      scenarioImage?: string;
      category?: string;
    }>();
  const { showAlert } = useAppAlert();
  const isSubmittingRef = useRef(false);
  const isActiveRef = useRef(true);
  const attemptRef = useRef(0);
  const pendingCancellationRef = useRef<number | null>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>("difficulty");
  const [difficulty, setDifficulty] = useState(0); // 하(0) 중(1) 상(2)
  const [attitude, setAttitude] = useState(0); // 친절(0) 보통(1) 까다로움(2) 진상(3)
  const [timeFrom, setTimeFrom] = useState(0);
  const [timeTo, setTimeTo] = useState(0);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;
      attemptRef.current++;
      isSubmittingRef.current = false;
      setFlowStep("difficulty");
      setDifficulty(0);
      setAttitude(0);
      setTimeFrom(0);
      setTimeTo(0);
      setIsCreatingSession(false);
      return () => {
        isActiveRef.current = false;
        attemptRef.current++;
      };
    }, []),
  );

  /** 뒤로 가기: 시간 단계면 난이도 단계로, 난이도 단계면 이전 화면으로 */
  const handleBack = () => {
    if (flowStep === "time") {
      setFlowStep("difficulty");
    } else if (router.canGoBack()) {
      // 상세는 목록 위에 떠 있는 바텀시트라 스택을 되감으면 그대로 복원된다
      router.back();
    } else {
      router.replace("/(tabs)/(train)/list");
    }
  };

  useAndroidBackHandler(() => {
    handleBack();
    return true;
  });

  /** 취소 응답을 받지 못한 예약에 재시도와 수신 시 거절하는 복구 경로를 제공한다. */
  const showCancellationRecovery = (scheduleId: number): void => {
    showAlert({
      title: "예약 취소를 확인하지 못했어요",
      description:
        "네트워크 연결을 확인하고 취소를 다시 시도해 주세요. 홈으로 돌아간 뒤 예약 전화가 오면 수신 화면에서 거절할 수도 있어요.",
      confirmLabel: "취소 다시 시도",
      onConfirm: () => void retryScheduleCancellation(scheduleId),
      cancelLabel: "홈으로",
      onCancel: () => router.replace("/(tabs)/(home)/home"),
      closeOnBackdrop: false,
    });
  };

  /** 새 예약을 만들지 않고 실패했던 동일한 예약의 취소만 다시 요청한다. */
  const retryScheduleCancellation = async (scheduleId: number): Promise<void> => {
    if (!isActiveRef.current || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const attempt = ++attemptRef.current;
    const isCurrent = () => isActiveRef.current && attempt === attemptRef.current;
    setIsCreatingSession(true);
    try {
      await cancelTrainingCallSchedule(scheduleId);
      pendingCancellationRef.current = null;
      await removeTrainingCallScenario(scheduleId).catch(() => {});
      if (!isCurrent()) return;
      showAlert({
        title: "예약을 취소했어요",
        onConfirm: () => router.replace("/(tabs)/(home)/home"),
      });
    } catch {
      if (isCurrent()) showCancellationRecovery(scheduleId);
    } finally {
      if (isCurrent()) {
        isSubmittingRef.current = false;
        setIsCreatingSession(false);
      }
    }
  };

  /** 즉시 발신은 세션을 생성하고 예약 발신은 서버에 시간 범위를 등록한다. */
  const handleComplete = async () => {
    if (!isActiveRef.current) return;
    if (pendingCancellationRef.current !== null) {
      showCancellationRecovery(pendingCancellationRef.current);
      return;
    }
    const scenarioId = Number(id);
    if (
      !Number.isSafeInteger(scenarioId) ||
      scenarioId <= 0 ||
      timeFrom > timeTo ||
      isSubmittingRef.current
    )
      return;
    isSubmittingRef.current = true;
    const attempt = ++attemptRef.current;
    const isCurrent = () => isActiveRef.current && attempt === attemptRef.current;
    let didNavigate = false;
    setIsCreatingSession(true);
    try {
      if (!(await ensureSensitiveConsent()) || !isCurrent()) return;
      const sessionConfig = {
        scenarioId,
        type: isCustom === "true" ? "CUSTOM" : "SCENARIO",
        aiPersonality: SPRING_PERSONALITY_MAP[attitude],
        difficulty: DIFFICULTY_MAP[difficulty],
      } as const;
      if (timeFrom === 0 && timeTo === 0) {
        const session = await createSession(sessionConfig);
        if (!isCurrent()) return;
        if (!session?.sessionId || !session.wsUrl) throw new Error("통화 세션을 받지 못했어요.");
        router.push({
          pathname: "/train",
          params: {
            sessionId: session.sessionId,
            wsUrl: session.wsUrl,
            scenarioId: id,
            title,
            content,
            isCustom,
            scenarioImage,
            category,
          },
        });
      } else {
        const schedule = await createTrainingCallSchedule({
          scenarioId,
          type: sessionConfig.type,
          aiPersonality: sessionConfig.aiPersonality,
          minDelayMinutes: timeFrom,
          maxDelayMinutes: timeTo,
        });
        try {
          await saveTrainingCallScenario(schedule.scheduleId, scenarioId, schedule.scheduledAt);
        } catch {
          try {
            await cancelTrainingCallSchedule(schedule.scheduleId);
          } catch {
            pendingCancellationRef.current = schedule.scheduleId;
            if (isCurrent()) showCancellationRecovery(schedule.scheduleId);
            return;
          }
          throw new Error(
            "예약 정보를 기기에 저장하지 못해 예약을 취소했어요. 다시 시도해 주세요.",
          );
        }
        if (!isCurrent()) return;
        router.replace("/(tabs)/(home)/home");
        showAlert({
          title: "발신을 예약했어요",
          description: `${timeFrom}분~${timeTo}분 사이에 전화가 와요. 앱을 다시 열어도 수신 중인 예약을 확인할 수 있어요.`,
        });
      }
      didNavigate = true;
    } catch (error) {
      if (!isCurrent()) return;
      showAlert({
        title: "훈련을 시작하지 못했어요",
        description: getApiErrorMessage(
          error,
          "네트워크 상태를 확인하고 다시 시도해 주세요.",
        ),
      });
    } finally {
      if (!didNavigate && isCurrent()) {
        isSubmittingRef.current = false;
        setIsCreatingSession(false);
      }
    }
  };

  const currentStep = FLOW_STEPS.indexOf(flowStep) + 1;
  // 최소가 최대보다 크면 발신 시간 범위가 성립하지 않아 완료를 막는다
  const isCallDelayInvalid = timeFrom > timeTo;
  const callDelayHint = isCallDelayInvalid
    ? "최대 시간은 최소 시간보다 작을 수 없어요."
    : timeFrom === 0 && timeTo === 0
      ? "바로 훈련이 시작돼요!"
      : `${timeFrom}분~${timeTo}분 사이에 전화가 와요. 예약 전화는 기본 난이도로 진행돼요.`;

  return (
    <View className="flex-1 bg-background-normal">
      <Top title="훈련 설정" back onBack={handleBack} />
      <View className="px-[33px]">
        <StepProgress total={FLOW_STEPS.length} current={currentStep} />
      </View>

      {flowStep === "difficulty" ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[33px] pt-8 pb-6 gap-y-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-y-8">
            <TrainingSettingTitle setting="difficulty" />
            <StepSlider
              steps={DIFFICULTY_LABELS}
              value={difficulty}
              onChange={setDifficulty}
            />
          </View>

          <View className="gap-y-8">
            <TrainingSettingTitle setting="attitude" />
            <StepSlider
              steps={ATTITUDE_LABELS}
              value={attitude}
              onChange={setAttitude}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[33px] pt-6 pb-6"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <MinuteRangePicker
            from={timeFrom}
            to={timeTo}
            onChangeFrom={setTimeFrom}
            onChangeTo={setTimeTo}
          />

          <View className="mt-8 rounded-component bg-fill-normal px-[10px] py-4">
            <Text className="text-label font-medium text-label-alternative">
              • 설정한 시간 범위 안에서 무작위로 전화가 걸려와요.
            </Text>
          </View>
        </ScrollView>
      )}

      <View
        className="shrink-0 px-[33px] pt-4 gap-y-3"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {/* 발신 설정 단계에서만 언제 훈련이 시작되는지 미리 알려준다 */}
        {flowStep === "time" && (
          <Text
            className={`text-label font-bold text-center ${
              isCallDelayInvalid ? "text-[#F65C5C]" : "text-primary-normal"
            }`}
          >
            {callDelayHint}
          </Text>
        )}
        {flowStep === "difficulty" ? (
          <CustomButton
            label="다음으로"
            tone="primary"
            onPress={() => setFlowStep("time")}
          />
        ) : (
          <CustomButton
            label={isCreatingSession ? "처리 중..." : "설정 완료하기"}
            tone="primary"
            disabled={isCreatingSession || isCallDelayInvalid}
            onPress={handleComplete}
          />
        )}
      </View>
    </View>
  );
}
