import { getApiErrorMessage } from "@/api/error";
import { useAppAlert } from "@/context/AppAlertContext";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import StepSlider from "@/components/train/StepSlider";
import TrainingSettingTitle from "@/components/train/TrainingSettingTitle";
import { createSession } from "@/api/trainApi";
import {
  ATTITUDE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_MAP,
  SPRING_PERSONALITY_MAP,
} from "@/constants/train";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSensitiveConsentGuard } from "@/hooks/useSensitiveConsentGuard";

export default function WarmupStart() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppAlert();
  const ensureSensitiveConsent = useSensitiveConsentGuard();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [difficulty, setDifficulty] = useState(0); // 하(0) 중(1) 상(2)
  const [attitude, setAttitude] = useState(0); // 친절(0) 보통(1) 까다로움(2) 진상(3)
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const isCreatingRef = useRef(false);
  const isActiveRef = useRef(true);
  const attemptRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;
      isCreatingRef.current = false;
      attemptRef.current++;
      setDifficulty(0);
      setAttitude(0);
      setIsCreatingSession(false);
      return () => {
        isActiveRef.current = false;
        isCreatingRef.current = false;
        attemptRef.current++;
      };
    }, []),
  );

  /** 워밍업 세션 생성 — 발신 시간은 0초(즉시 발신) 고정 */
  const handleComplete = async () => {
    if (isCreatingRef.current || !isActiveRef.current) return;
    const scenarioId = Number(id);
    if (!id || !Number.isSafeInteger(scenarioId) || scenarioId <= 0) {
      showAlert({ title: "시나리오를 찾을 수 없어요", description: "워밍업 시나리오를 다시 선택해 주세요." });
      return;
    }
    isCreatingRef.current = true;
    const attempt = ++attemptRef.current;
    setIsCreatingSession(true);
    let didNavigate = false;
    try {
      if (!(await ensureSensitiveConsent()) || !isActiveRef.current || attempt !== attemptRef.current) return;
      const session = await createSession({
        scenarioId,
        type: "WARMUP",
        aiPersonality: SPRING_PERSONALITY_MAP[attitude],
        difficulty: DIFFICULTY_MAP[difficulty],
        maxDurationSeconds: 0,
      });
      if (!isActiveRef.current || attempt !== attemptRef.current) return;
      if (!session?.sessionId || !session.wsUrl) throw new Error("통화 세션을 받지 못했어요.");
      router.push({
        pathname: "/train",
        params: {
          sessionId: session.sessionId,
          wsUrl: session.wsUrl,
          scenarioId: id,
          isWarmup: "true",
        },
      });
      didNavigate = true;
    } catch (error) {
      if (!isActiveRef.current || attempt !== attemptRef.current) return;
      showAlert({ title: "워밍업을 시작하지 못했어요", description: getApiErrorMessage(error, "연결 상태를 확인한 뒤 다시 시도해 주세요.") });
    } finally {
      if (!didNavigate && isActiveRef.current && attempt === attemptRef.current) {
        isCreatingRef.current = false;
        setIsCreatingSession(false);
      }
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <Top title="워밍업 설정" back onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pt-4 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10">
          <View className="mb-8">
            <TrainingSettingTitle setting="difficulty" />
          </View>
          <StepSlider
            steps={DIFFICULTY_LABELS}
            value={difficulty}
            onChange={setDifficulty}
          />
        </View>

        <View>
          <View className="mb-8">
            <TrainingSettingTitle setting="attitude" />
          </View>
          <StepSlider
            steps={ATTITUDE_LABELS}
            value={attitude}
            onChange={setAttitude}
          />
        </View>
      </ScrollView>

      <View
        className="shrink-0 px-8 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <CustomButton
          label={isCreatingSession ? "처리 중..." : "워밍업 시작하기"}
          tone="primary"
          disabled={isCreatingSession}
          onPress={handleComplete}
        />
      </View>
    </View>
  );
}
