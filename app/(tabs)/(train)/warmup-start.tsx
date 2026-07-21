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

const SLIDER_HEIGHT = 50;
const KNOB_SIZE = 30;
const DOT_SIZE = 10;

/** 인덱스 → knob 중심 x 좌표 (좌우 KNOB_SIZE/2 만큼 inset) */
function getStepCenterX(index: number, lastIndex: number, trackWidth: number): number {
  if (trackWidth === 0) return 0;
  if (lastIndex <= 0) return trackWidth / 2;
  return KNOB_SIZE / 2 + (index / lastIndex) * (trackWidth - KNOB_SIZE);
}

/** 단계별 슬라이더 (탭 및 드래그로 선택) */
function StepSlider({ steps, value, onChange }: StepSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  const stepsRef = useRef(steps);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  stepsRef.current = steps;
  onChangeRef.current = onChange;

  /** x 좌표 → 가장 가까운 단계 인덱스 계산 (getStepCenterX의 역변환) */
  const getStepIndex = (x: number): number => {
    const usableWidth = trackWidthRef.current - KNOB_SIZE;
    const lastIndex = stepsRef.current.length - 1;
    if (usableWidth <= 0 || lastIndex <= 0) return valueRef.current;
    const index = Math.round(((x - KNOB_SIZE / 2) / usableWidth) * lastIndex);
    return Math.max(0, Math.min(lastIndex, index));
  };

  /** 단계가 실제로 바뀔 때만 상위에 알림 */
  const commitStep = (x: number) => {
    const next = getStepIndex(x);
    if (next !== valueRef.current) onChangeRef.current(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 드래그 중 상위 뷰가 제스처를 가져가지 못하도록 유지
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => commitStep(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => commitStep(evt.nativeEvent.locationX),
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
          const size = isSelected ? KNOB_SIZE : DOT_SIZE;
          const centerX = getStepCenterX(index, steps.length - 1, trackWidth);
          return (
            <View
              key={index}
              style={[
                isSelected ? styles.knob : styles.dot,
                { left: centerX - size / 2, top: (SLIDER_HEIGHT - size) / 2 },
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
        pathname: "/(tabs)/(train)/train",
        params: { sessionId: session.sessionId, wsUrl: session.wsUrl, isWarmup: "true" },
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
    height: SLIDER_HEIGHT,
    justifyContent: "center",
  },
  // 자식 뷰가 터치 타겟이 되면 locationX가 자식 기준으로 계산돼 포인터가 튀므로 터치를 받지 않게 한다
  trackLine: {
    height: 18,
    backgroundColor: "#EBEBEC",
    borderRadius: 9,
    pointerEvents: "none",
  },
  knob: {
    position: "absolute",
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    pointerEvents: "none",
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#C8C8C8",
    pointerEvents: "none",
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
