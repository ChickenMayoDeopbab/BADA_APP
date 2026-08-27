import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const SLIDER_HEIGHT = 32;
const TRACK_HEIGHT = 20;
const KNOB_SIZE = 32;
const DOT_SIZE = 12;
/** 노브가 단계 사이를 미끄러지는 시간(ms) — 단계가 뚝뚝 끊겨 보이지 않게 한다 */
const KNOB_MOVE_MS = 140;

interface StepSliderProps {
  steps: readonly string[];
  value: number;
  onChange: (index: number) => void;
}

/** 단계별 슬라이더 (탭 및 드래그로 선택) */
export default function StepSlider({ steps, value, onChange }: StepSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 노브 위치는 리액트 상태가 아니라 공유 값으로 옮긴다.
  // 드래그 중 리렌더를 기다리지 않아 끊기지 않는다.
  const knobLeft = useSharedValue(0);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobLeft.value }],
  }));

  /** 단계 인덱스 → 트랙 위 중심 x (노브가 트랙 밖으로 나가지 않도록 안쪽 여백을 둔다) */
  const getCenterX = (index: number, width: number): number =>
    KNOB_SIZE / 2 + (index / (steps.length - 1)) * (width - KNOB_SIZE);

  /** x 좌표 → 가장 가까운 단계 인덱스 계산 */
  const getStepIndex = (x: number): number => {
    const width = trackWidthRef.current;
    if (width === 0) return valueRef.current;
    const index = Math.round((x / width) * (steps.length - 1));
    return Math.max(0, Math.min(steps.length - 1, index));
  };

  /** 노브는 즉시 옮기고, 단계는 실제로 바뀔 때만 부모에 알린다 */
  const applyIndex = (nextIndex: number) => {
    const width = trackWidthRef.current;
    if (width === 0) return;
    knobLeft.value = withTiming(getCenterX(nextIndex, width) - KNOB_SIZE / 2, {
      duration: KNOB_MOVE_MS,
      easing: Easing.out(Easing.quad),
    });
    if (nextIndex !== valueRef.current) onChange(nextIndex);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) =>
        applyIndex(getStepIndex(event.nativeEvent.locationX)),
      onPanResponderMove: (event) =>
        applyIndex(getStepIndex(event.nativeEvent.locationX)),
    })
  ).current;

  // 폭을 재고 나서, 그리고 값이 밖에서 바뀔 때 노브 위치를 맞춘다
  useEffect(() => {
    if (trackWidth === 0) return;
    knobLeft.value = withTiming(getCenterX(value, trackWidth) - KNOB_SIZE / 2, {
      duration: KNOB_MOVE_MS,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, trackWidth]);

  return (
    <View>
      <View
        style={styles.sliderArea}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        {/*
          트랙·점·노브가 터치 타깃이 되면 locationX가 그 요소 기준이라 단계 계산이 어긋난다.
          각각 터치를 통과시켜 트랙 전체를 기준으로 좌표를 받는다.
          점·노브의 top은 슬라이더 높이 기준이므로 감싸는 층을 두지 않고 직접 자식으로 둔다.
        */}
        <View pointerEvents="none" style={styles.track} className="rounded-pill bg-fill-neutral" />
        {steps.map((_, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.dot,
              {
                left: (trackWidth > 0 ? getCenterX(index, trackWidth) : 0) - DOT_SIZE / 2,
                top: (SLIDER_HEIGHT - DOT_SIZE) / 2,
              },
            ]}
          />
        ))}
        {/* 노브는 항상 떠 있고 위치만 움직인다 — 매번 다시 그리면 끊긴다 */}
        <Animated.View pointerEvents="none" style={[styles.knob, knobStyle]} />
      </View>

      <View className="flex-row items-center justify-between mt-3">
        {steps.map((step, index) => (
          <Text
            key={index}
            className={`text-caption ${
              index === value
                ? "font-bold text-primary-normal"
                : "font-medium text-label-alternative"
            }`}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderArea: {
    height: SLIDER_HEIGHT,
  },
  /* 트랙·점·노브 모두 슬라이더 높이를 기준으로 절대 배치해야 세로 중심이 어긋나지 않는다 */
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (SLIDER_HEIGHT - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
  },
  knob: {
    position: "absolute",
    left: 0,
    top: (SLIDER_HEIGHT - KNOB_SIZE) / 2,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: SEMANTIC_COLORS.background.normal,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: SEMANTIC_COLORS.line.neutral,
  },
});
