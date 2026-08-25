import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

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

  /** x 좌표 → 가장 가까운 단계 인덱스 계산 */
  const getStepIndex = (x: number): number => {
    const width = trackWidthRef.current;
    if (width === 0) return valueRef.current;
    const index = Math.round((x / width) * (steps.length - 1));
    return Math.max(0, Math.min(steps.length - 1, index));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => onChange(getStepIndex(event.nativeEvent.locationX)),
      onPanResponderMove: (event) => onChange(getStepIndex(event.nativeEvent.locationX)),
    })
  ).current;

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
        <View className="h-5 rounded-pill bg-fill-neutral" />
        {steps.map((_, index) => {
          const isSelected = index === value;
          const size = isSelected ? KNOB_SIZE : DOT_SIZE;
          // 트랙 안쪽 여백(KNOB_SIZE/2)을 뺀 폭에 단계를 균등 배치한다
          const centerX =
            trackWidth > 0
              ? KNOB_SIZE / 2 + (index / (steps.length - 1)) * (trackWidth - KNOB_SIZE)
              : 0;
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

const SLIDER_HEIGHT = 32;
const KNOB_SIZE = 32;
const DOT_SIZE = 12;

const styles = StyleSheet.create({
  sliderArea: {
    height: SLIDER_HEIGHT,
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
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
