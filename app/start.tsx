import { createSession } from "@/api/trainApi";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import MinuteRangePicker from "@/components/train/MinuteRangePicker";
import StepProgress from "@/components/train/StepProgress";
import StepSlider from "@/components/train/StepSlider";
import {
  ATTITUDE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_MAP,
  SPRING_PERSONALITY_MAP,
} from "@/constants/train";
import { cancelTrainingCallSchedule, createTrainingCallSchedule } from "@/api/trainingCallApi";
import { saveTrainingCallScenario } from "@/utils/trainingCallScenario";
import { getApiErrorMessage } from "@/api/error";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useSensitiveConsentGuard } from "@/hooks/useSensitiveConsentGuard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FlowStep = "difficulty" | "time";

const FLOW_STEPS: FlowStep[] = ["difficulty", "time"];

interface SectionTitleProps {
  title: string;
}

/** 물음표 아이콘이 붙는 설정 항목 제목 */
function SectionTitle({ title }: SectionTitleProps) {
  return (
    <View className="flex-row items-center gap-x-1">
      <Text className="text-headline1 font-bold text-label-normal">{title}</Text>
      <Ionicons
        name="help-circle"
        size={20}
        color={SEMANTIC_COLORS.line.normal}
      />
    </View>
  );
}

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

  const [flowStep, setFlowStep] = useState<FlowStep>("difficulty");
  const [difficulty, setDifficulty] = useState(0); // 하(0) 중(1) 상(2)
  const [attitude, setAttitude] = useState(0); // 친절(0) 보통(1) 까다로움(2) 진상(3)
  const [timeFrom, setTimeFrom] = useState(0);
  const [timeTo, setTimeTo] = useState(0);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFlowStep("difficulty");
      setDifficulty(0);
      setAttitude(0);
      setTimeFrom(0);
      setTimeTo(0);
      setIsCreatingSession(false);
    }, [])
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

  /** 즉시 발신은 세션을 생성하고 예약 발신은 서버에 시간 범위를 등록한다. */
  const handleComplete = async () => {
    const scenarioId = Number(id);
    if (
      !Number.isSafeInteger(scenarioId) || scenarioId <= 0 ||
      timeFrom > timeTo || isSubmittingRef.current
    ) return;
    isSubmittingRef.current = true;
    setIsCreatingSession(true);
    try {
      if (!(await ensureSensitiveConsent())) return;
      const sessionConfig = {
        scenarioId,
        type: isCustom === "true" ? "CUSTOM" : "SCENARIO",
        aiPersonality: SPRING_PERSONALITY_MAP[attitude],
        difficulty: DIFFICULTY_MAP[difficulty],
      } as const;
      if (timeFrom === 0 && timeTo === 0) {
        const session = await createSession(sessionConfig);
        router.push({
          pathname: "/train",
          params: {
            sessionId: session.sessionId,
            wsUrl: session.wsUrl,
            scenarioId: id,
            title, content, isCustom, scenarioImage, category,
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
          await saveTrainingCallScenario(schedule.scheduleId, scenarioId);
        } catch {
          await cancelTrainingCallSchedule(schedule.scheduleId);
          throw new Error("예약 정보를 기기에 저장하지 못해 예약을 취소했어요. 다시 시도해 주세요.");
        }
        router.replace("/(tabs)/(home)/home");
        showAlert({
          title: "발신을 예약했어요",
          description: `${timeFrom}분~${timeTo}분 사이에 전화가 와요. 앱을 다시 열어도 수신 중인 예약을 확인할 수 있어요.`,
        });
      }
    } catch (error) {
      showAlert({
        title: "훈련을 시작하지 못했어요",
        description: getApiErrorMessage(error, "네트워크 상태를 확인하고 다시 시도해 주세요."),
      });
    } finally {
      isSubmittingRef.current = false;
      setIsCreatingSession(false);
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
        <View className="flex-1 px-[33px] pt-[70px] gap-y-[74px]">
          <View className="gap-y-8">
            <SectionTitle title="난이도" />
            <StepSlider
              steps={DIFFICULTY_LABELS}
              value={difficulty}
              onChange={setDifficulty}
            />
          </View>

          <View className="gap-y-8">
            <SectionTitle title="상대의 태도" />
            <StepSlider
              steps={ATTITUDE_LABELS}
              value={attitude}
              onChange={setAttitude}
            />
          </View>
        </View>
      ) : (
        <View className="flex-1 px-[33px] pt-[60px]">
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
        </View>
      )}

      <View className="px-[33px] pt-4 gap-y-3" style={{ paddingBottom: insets.bottom + 40 }}>
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
