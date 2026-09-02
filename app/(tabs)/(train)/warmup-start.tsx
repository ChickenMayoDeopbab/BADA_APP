import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import StepSlider from "@/components/train/StepSlider";
import { createSession } from "@/api/trainApi";
import { ATTITUDE_LABELS, DIFFICULTY_LABELS, DIFFICULTY_MAP, SPRING_PERSONALITY_MAP } from "@/constants/train";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

export default function WarmupStart() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [difficulty, setDifficulty] = useState(0); // 하(0) 중(1) 상(2)
  const [attitude, setAttitude] = useState(0); // 친절(0) 보통(1) 까다로움(2) 진상(3)
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setDifficulty(0);
      setAttitude(0);
      setIsCreatingSession(false);
    }, [])
  );

  /** 워밍업 세션 생성 — 발신 시간은 0초(즉시 발신) 고정 */
  const handleComplete = async () => {
    if (!id) return;

    setIsCreatingSession(true);
    try {
      const session = await createSession({
        scenarioId: parseInt(id, 10),
        type: "WARMUP",
        aiPersonality: SPRING_PERSONALITY_MAP[attitude],
        difficulty: DIFFICULTY_MAP[difficulty],
        maxDurationSeconds: 0,
      });
      router.push({
        pathname: "/train",
        params: {
          sessionId: session.sessionId,
          wsUrl: session.wsUrl,
          scenarioId: id,
          isWarmup: "true",
        },
      });
    } catch {
      setIsCreatingSession(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Top title="워밍업 설정" back onBack={() => router.back()} />
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
          label={isCreatingSession ? "처리 중..." : "워밍업 시작하기"}
          backgroundColor="#0AE365"
          color="white"
          disabled={isCreatingSession}
          onPress={handleComplete}
        />
      </View>
    </View>
  );
}
