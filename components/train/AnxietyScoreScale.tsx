import ScoreTooltip from "@/assets/scoreTooltip.svg";
import { ANXIETY_SCORE_COLORS, ANXIETY_SCORE_MAX } from "@/constants/train";
import { useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

const BAR_GAP = 4;
const BAR_HEIGHT = 48;
const TOOLTIP_WIDTH = 63.8;
const TOOLTIP_HEIGHT = 74.85;
/** 말풍선 꼬리 끝과 막대 사이 간격 */
const TOOLTIP_OFFSET = 6;

interface AnxietyScoreScaleProps {
  score: number;
  onChange: (score: number) => void;
}

/** 고른 점수를 막대 위에 띄우는 말풍선 */
function ScoreBubble({ score }: { score: number }) {
  return (
    <View style={styles.bubbleAnchor} pointerEvents="none">
      <View style={styles.bubble}>
        <ScoreTooltip width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} />
        <Text className="absolute w-full text-title2 font-bold text-label-normal text-center top-3">
          {score}
        </Text>
      </View>
    </View>
  );
}

/**
 * 0~10 불안 점수를 고르는 막대 스케일.
 * 막대 10칸은 편안함(초록)에서 매우 불안(빨강)으로 이어지고,
 * 고른 점수까지의 막대만 색이 채워진다.
 */
export default function AnxietyScoreScale({ score, onChange }: AnxietyScoreScaleProps) {
  const trackWidthRef = useRef(0);
  const scoreRef = useRef(score);
  scoreRef.current = score;

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => onChange(getScoreAt(event.nativeEvent.locationX)),
      onPanResponderMove: (event) => onChange(getScoreAt(event.nativeEvent.locationX)),
    })
  ).current;

  // 0점도 첫 칸은 채워 보여주므로 최소 한 칸은 항상 색이 들어간다
  const filledCount = Math.max(score, 1);
  const pointerIndex = filledCount - 1;

  return (
    <View className="gap-y-[6px]">
      {/* 막대 위로 튀어나오는 말풍선 자리를 미리 비워 둔다 */}
      <View style={{ height: TOOLTIP_HEIGHT }} />

      <View
        className="flex-row"
        style={{ gap: BAR_GAP }}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        {ANXIETY_SCORE_COLORS.map((color, index) => (
          <View
            key={index}
            className="flex-1 rounded-[4px] bg-fill-alternative"
            style={[
              { height: BAR_HEIGHT },
              index < filledCount && { backgroundColor: color },
            ]}
          >
            {/* 말풍선은 가리키는 막대에 붙여 두면 따로 위치를 재지 않아도 된다 */}
            {index === pointerIndex && <ScoreBubble score={score} />}
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-body font-medium text-label-alternative">0 (편안함)</Text>
        <Text className="text-body font-medium text-label-alternative">10 (매우 불안)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: BAR_HEIGHT + TOOLTIP_OFFSET,
    alignItems: "center",
  },
  bubble: {
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_HEIGHT,
  },
});
