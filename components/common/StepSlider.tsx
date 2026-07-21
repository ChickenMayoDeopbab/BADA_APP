import { useRef, useState } from "react";
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
export default function StepSlider({ steps, value, onChange }: StepSliderProps) {
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
