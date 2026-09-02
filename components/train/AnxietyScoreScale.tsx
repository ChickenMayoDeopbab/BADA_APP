import ScoreTooltip from "@/assets/scoreTooltip.svg";
import { ANXIETY_SCORE_COLORS, ANXIETY_SCORE_MAX } from "@/constants/train";
import { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const BAR_GAP = 4;
const BAR_HEIGHT = 48;
const BAR_COUNT = ANXIETY_SCORE_COLORS.length;
const TOOLTIP_WIDTH = 63.8;
const TOOLTIP_HEIGHT = 74.85;
/** 말풍선 꼬리 끝과 막대 사이 간격 */
const TOOLTIP_OFFSET = 6;

interface AnxietyScoreScaleProps {
  score: number;
  onChange: (score: number) => void;
}

/**
 * 0~10 불안 점수를 고르는 막대 스케일.
 * 막대 10칸은 편안함(초록)에서 매우 불안(빨강)으로 이어지고,
 * 고른 점수까지의 막대만 색이 채워진다.
 * 막대와 말풍선 어느 쪽을 잡아도 드래그로 점수를 바꿀 수 있다.
 */
export default function AnxietyScoreScale({ score, onChange }: AnxietyScoreScaleProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const scoreRef = useRef(score);
  scoreRef.current = score;
  /** 말풍선을 잡았을 때 잡은 지점과 말풍선 중심의 거리 — 잡는 순간 튀지 않게 한다 */
  const grabOffsetRef = useRef(0);

  // 말풍선 위치는 리액트 상태가 아니라 공유 값으로 옮긴다.
  // 드래그 중 리렌더를 기다리지 않고 손가락을 그대로 따라간다.
  const bubbleLeft = useSharedValue(0);
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleLeft.value }],
  }));

  /** 점수가 가리키는 막대의 중심 x — 0점도 첫 칸을 채우므로 최소 한 칸은 항상 색이 있다 */
  const getPointerCenterX = (targetScore: number, width: number): number => {
    const barWidth = (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
    const pointerIndex = Math.max(targetScore, 1) - 1;
    return pointerIndex * (barWidth + BAR_GAP) + barWidth / 2;
  };

  /**
   * x 좌표 → 가장 가까운 점수.
   * 고를 수 있는 값은 0~10으로 11가지라 막대 10칸이 아니라 트랙 전체 폭을 11등분한다.
   */
  const getScoreAt = (x: number): number => {
    const width = trackWidthRef.current;
    if (width === 0) return scoreRef.current;
    const nextScore = Math.round((x / width) * ANXIETY_SCORE_MAX);
    return Math.max(0, Math.min(ANXIETY_SCORE_MAX, nextScore));
  };

  /** 말풍선은 즉시 옮기고, 점수는 실제로 바뀔 때만 부모에 알린다 */
  const applyScore = (nextScore: number) => {
    const width = trackWidthRef.current;
    if (width === 0) return;
    bubbleLeft.value = getPointerCenterX(nextScore, width) - TOOLTIP_WIDTH / 2;
    if (nextScore !== scoreRef.current) onChange(nextScore);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        const width = trackWidthRef.current;
        if (width === 0) return;

        const centerX = getPointerCenterX(scoreRef.current, width);
        const isBubbleGrabbed =
          locationY <= TOOLTIP_HEIGHT &&
          Math.abs(locationX - centerX) <= TOOLTIP_WIDTH / 2;

        // 말풍선을 잡았으면 그 자리를 유지하고, 막대를 눌렀으면 누른 지점으로 옮긴다
        grabOffsetRef.current = isBubbleGrabbed ? centerX - locationX : 0;
        if (!isBubbleGrabbed) applyScore(getScoreAt(locationX));
      },
      onPanResponderMove: (event) =>
        applyScore(getScoreAt(event.nativeEvent.locationX + grabOffsetRef.current)),
      onPanResponderRelease: () => {
        grabOffsetRef.current = 0;
      },
    })
  ).current;

  // 폭을 재고 나서, 그리고 점수가 밖에서 바뀔 때 말풍선 위치를 맞춘다
  useEffect(() => {
    if (trackWidth === 0) return;
    bubbleLeft.value = getPointerCenterX(score, trackWidth) - TOOLTIP_WIDTH / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, trackWidth]);

  const filledCount = Math.max(score, 1);

  return (
    <View className="gap-y-[6px]">
      {/* 말풍선과 막대를 한 영역으로 묶어야 말풍선을 잡고 끌 수 있다 */}
      <View
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        {/* 말풍선은 항상 떠 있고 위치만 움직인다 — 매번 다시 그리면 끊긴다 */}
        <View style={styles.bubbleRow} pointerEvents="none">
          <Animated.View style={[styles.bubble, bubbleStyle]}>
            <ScoreTooltip width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} />
            <Text className="absolute w-full text-title2 font-bold text-label-normal text-center top-3">
              {score}
            </Text>
          </Animated.View>
        </View>

        {/*
          막대가 터치 타깃이 되면 locationX가 그 막대 기준이라 항상 0~1점으로 계산된다.
          터치를 통과시켜 래퍼(트랙 전체)를 기준으로 좌표를 받는다.
        */}
        <View className="flex-row" style={styles.barRow} pointerEvents="none">
          {ANXIETY_SCORE_COLORS.map((color, index) => (
            <View
              key={index}
              className="flex-1 rounded-[4px] bg-fill-alternative"
              style={[
                styles.bar,
                index < filledCount && { backgroundColor: color },
              ]}
            />
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-body font-medium text-label-alternative">0 (편안함)</Text>
        <Text className="text-body font-medium text-label-alternative">10 (매우 불안)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: {
    height: TOOLTIP_HEIGHT + TOOLTIP_OFFSET,
    paddingBottom: TOOLTIP_OFFSET,
  },
  bubble: {
    position: "absolute",
    left: 0,
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_HEIGHT,
  },
  barRow: {
    gap: BAR_GAP,
  },
  bar: {
    height: BAR_HEIGHT,
  },
});
