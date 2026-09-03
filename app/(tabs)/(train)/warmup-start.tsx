import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { createSession } from "@/api/trainApi";
import { ATTITUDE_LABELS, DIFFICULTY_LABELS, DIFFICULTY_MAP, SPRING_PERSONALITY_MAP } from "@/constants/train";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

interface StepSliderProps {
  steps: readonly string[];
  value: number;
  onChange: (index: number) => void;
}

/** 단계별 슬라이더 (탭 및 드래그로 선택) */
function StepSlider({ steps, value, onChange }: StepSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  /** x 좌표 → 가장 가까운 단계 인덱스 계산 */
  const getStepIndex = (x: number): number => {
    const w = trackWidthRef.current;
    if (w === 0) return valueRef.current;
    const index = Math.round((x / w) * (steps.length - 1));
    return Math.max(0, Math.min(steps.length - 1, index));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => onChange(getStepIndex(evt.nativeEvent.locationX)),
      onPanResponderMove: (evt) => onChange(getStepIndex(evt.nativeEvent.locationX)),
    })
  ).current;

  return (
    <View>
      <View
        style={styles.sliderArea}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackLine} />
        {steps.map((_, index) => {
          const isSelected = index === value;
          const size = isSelected ? 30 : 10;
          const centerX = trackWidth > 0
            ? 15 + (index / (steps.length - 1)) * (trackWidth - 30)
            : 0;
          return (
            <View
              key={index}
              style={[
                isSelected ? styles.knob : styles.dot,
                { left: centerX - size / 2, top: (50 - size) / 2 },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {steps.map((step, index) => (
          <Text
            key={index}
            style={[styles.label, { color: index === value ? "#0AE365" : "#BDBEBE" }]}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function WarmupStart() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [difficulty, setDifficulty] = useState(0); // 상(0) 중(1) 하(2)
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
        pathname: "/(tabs)/(train)/train",
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

const styles = StyleSheet.create({
  sliderArea: {
    height: 50,
    justifyContent: "center",
  },
  trackLine: {
    height: 18,
    backgroundColor: "#EBEBEC",
    borderRadius: 9,
  },
  knob: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C8C8C8",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
