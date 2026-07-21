import CustomButton from "@/components/common/CustomButton";
import StepSlider from "@/components/common/StepSlider";
import Top from "@/components/common/Top";
import { createSession } from "@/api/trainApi";
import { ATTITUDE_LABELS, DIFFICULTY_LABELS, DIFFICULTY_MAP, SPRING_PERSONALITY_MAP } from "@/constants/train";
import { usePendingCall } from "@/context/PendingCallContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FlowStep = "difficulty" | "time";

interface TimeInputProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

/** 분 단위 시간 입력 (감소/증가 버튼) */
function TimeInput({ value, onDecrement, onIncrement }: TimeInputProps) {
  return (
    <View className="flex-row items-end gap-x-2" style={styles.timeInputWrapper}>
      <Text className="text-2xl font-bold text-[#3B3D3E] pb-1">{value}분 후</Text>
      <View className="flex-row gap-x-1 pb-1">
        <TouchableOpacity
          onPress={onDecrement}
          activeOpacity={0.7}
          className="w-7 h-7 items-center justify-center"
        >
          <Text className="text-lg font-medium text-[#3B3D3E]">—</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onIncrement}
          activeOpacity={0.7}
          className="w-7 h-7 items-center justify-center"
        >
          <Text className="text-lg font-medium text-[#3B3D3E]">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Start() {
  const { id, isCustom } = useLocalSearchParams<{ id?: string; isCustom?: string }>();
  const { schedule } = usePendingCall();

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
    } else {
      router.back();
    }
  };

  const handleComplete = async () => {
    if (!id) return;

    const sessionConfig = {
      scenarioId: parseInt(id, 10),
      type: isCustom === "true" ? "CUSTOM" : "SCENARIO",
      aiPersonality: SPRING_PERSONALITY_MAP[attitude],
      difficulty: DIFFICULTY_MAP[difficulty],
    } as const;

    // 발신 시간이 모두 0이면 즉시 세션 생성 후 훈련 시작
    if (timeFrom === 0 && timeTo === 0) {
      setIsCreatingSession(true);
      try {
        const session = await createSession(sessionConfig);
        router.push({
          pathname: "/(tabs)/(train)/train",
          params: { sessionId: session.sessionId, wsUrl: session.wsUrl },
        });
      } catch {
        // 세션 생성 실패 시 버튼 재활성화
        setIsCreatingSession(false);
      }
      return;
    }

    // 발신 대기: timeFrom~timeTo 사이 랜덤 시간 후 발신 예약 후 홈으로 이동
    const from = Math.min(timeFrom, timeTo);
    const to = Math.max(timeFrom, timeTo);
    const delayMinutes = from + Math.random() * (to - from);
    const delayMs = Math.round(delayMinutes * 60 * 1000);

    schedule(sessionConfig, delayMs);
    router.push("/(tabs)/(home)/home");
  };

  if (flowStep === "difficulty") {
    return (
      <View className="flex-1 bg-white">
        <Top title="훈련 설정" back onBack={handleBack} />
        <View className="flex-1 px-8 pt-4">
          <View className="mb-10">
            <View className="flex-row items-center gap-x-2 mb-8">
              <Text className="text-xl font-bold text-[#3B3D3E]">난이도</Text>
              <Ionicons name="help-circle-outline" size={20} color="#BDBEBE" />
            </View>
            <StepSlider
              steps={DIFFICULTY_LABELS}
              value={difficulty}
              onChange={setDifficulty}
            />
          </View>

          <View>
            <View className="flex-row items-center gap-x-2 mb-8">
              <Text className="text-xl font-bold text-[#3B3D3E]">상대의 태도</Text>
              <Ionicons name="help-circle-outline" size={20} color="#BDBEBE" />
            </View>
            <StepSlider
              steps={ATTITUDE_LABELS}
              value={attitude}
              onChange={setAttitude}
            />
          </View>
        </View>

        <View className="px-8 pb-10 pt-4">
          <CustomButton
            label="다음으로"
            backgroundColor="#0AE365"
            color="white"
            onPress={() => setFlowStep("time")}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Top title="발신 설정" back onBack={handleBack} />
      <View className="flex-1 px-8 pt-4">
        <Text className="text-sm font-medium text-[#5C5E5E] mb-3">발신 시간</Text>

        <View className="flex-row items-center justify-between">
          <TimeInput
            value={timeFrom}
            onDecrement={() => setTimeFrom((v) => Math.max(0, v - 1))}
            onIncrement={() => setTimeFrom((v) => v + 1)}
          />
          <Text className="text-base text-[#3B3D3E] pb-1">부터</Text>
          <TimeInput
            value={timeTo}
            onDecrement={() => setTimeTo((v) => Math.max(0, v - 1))}
            onIncrement={() => setTimeTo((v) => v + 1)}
          />
        </View>

        <View className="mt-6 bg-[#F5F5F5] rounded-xl p-4 gap-y-1">
          <Text className="text-sm text-[#5C5E5E] leading-6">
            • 설정된 시간 중 AI가 랜덤으로 전화를 발신합니다.
          </Text>
          <Text className="text-sm text-[#5C5E5E] leading-6">
            • 숫자를 모두 0으로 설정할 경우 즉시 발신합니다.
          </Text>
        </View>
      </View>

      <View className="px-8 pb-10 pt-4">
        <CustomButton
          label={isCreatingSession ? "처리 중..." : "완료하기"}
          backgroundColor="#0AE365"
          color="white"
          disabled={isCreatingSession}
          onPress={handleComplete}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEC",
    paddingBottom: 4,
  },
});
