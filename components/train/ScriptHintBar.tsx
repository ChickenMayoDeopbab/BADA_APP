import HelpIcon from "@/assets/train/help.svg";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { ScriptHint } from "@/hooks/useTrainWebSocket";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** 서버 script_hint level 값 (같은 시나리오 연습 횟수에 따라 서버가 결정) */
const HINT_LEVEL = {
  recommend: 1, // 0~5회: 그대로 말할 수 있는 추천 문장
  advice: 2, // 6~10회: 대답 방향만 알려주는 조언
} as const;

interface ScriptHintBarProps {
  hint: ScriptHint | null;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

/**
 * 스크립트 패널 하단에 고정되는 대답 힌트 카드.
 * 추천 문장·조언만 그리고, 힌트 없음(level 3)이나 빈 문장은 영역째 숨긴다.
 */
export default function ScriptHintBar({ hint, isLoading, hasError, onRetry }: ScriptHintBarProps) {
  if (!hint?.text && (isLoading || hasError)) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.card, styles.adviceCard, styles.statusCard]}>
          <Text style={styles.text} className="text-label text-label-alternative">
            {isLoading ? "첫 답변 예시를 준비하고 있어요." : "첫 답변 예시를 불러오지 못했어요."}
          </Text>
          {hasError && (
            <TouchableOpacity accessibilityRole="button" onPress={onRetry}>
              <Text style={styles.text} className="text-label font-medium text-label-neutral">다시 시도</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
  if (!hint?.text) return null;

  const isRecommend = hint.level === HINT_LEVEL.recommend;
  const isAdvice = hint.level === HINT_LEVEL.advice;
  if (!isRecommend && !isAdvice) return null;

  return (
    <View style={styles.wrap}>
      {isRecommend ? (
        <View style={[styles.card, styles.recommendCard]}>
          <View style={styles.chip}>
            <Text style={[styles.text, styles.chipText]} className="text-caption font-bold">
              추천
            </Text>
          </View>
          <Text style={styles.text} className="flex-1 text-label font-bold text-label-normal">
            {hint.text}
          </Text>
        </View>
      ) : (
        <View style={[styles.card, styles.adviceCard]}>
          <HelpIcon />
          <Text style={styles.text} className="flex-1 text-label font-medium text-label-alternative">
            {hint.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 0, paddingHorizontal: 12, paddingBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  recommendCard: { backgroundColor: SEMANTIC_COLORS.train.scriptHintBackground },
  adviceCard: { backgroundColor: SEMANTIC_COLORS.fill.field },
  statusCard: { flexDirection: "column", alignItems: "flex-start" },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: PALETTE.green[40],
  },
  chipText: { color: PALETTE.common[0] },
  text: { includeFontPadding: false },
});
