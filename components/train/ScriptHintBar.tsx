import { SEMANTIC_COLORS } from "@/design-system/colors";
import { ScriptHint } from "@/hooks/useTrainWebSocket";
import Ionicons from "@expo/vector-icons/Ionicons";
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
 * 스크립트 박스 하단에 고정되는 대답 힌트.
 * 추천 문장·조언만 그리고, 힌트 없음(level 3)이나 빈 문장은 영역째 숨긴다.
 */
export default function ScriptHintBar({ hint, isLoading, hasError, onRetry }: ScriptHintBarProps) {
  if (!hint?.text && (isLoading || hasError)) {
    return (
      <View className="shrink-0 gap-y-2 pt-4">
        <Text style={styles.text} className="text-label text-label-alternative">
          {isLoading ? "첫 답변 예시를 준비하고 있어요." : "첫 답변 예시를 불러오지 못했어요."}
        </Text>
        {hasError && (
          <TouchableOpacity accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.text} className="text-label font-medium text-label-neutral">다시 시도</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  if (!hint?.text) return null;

  const isRecommend = hint.level === HINT_LEVEL.recommend;
  const isAdvice = hint.level === HINT_LEVEL.advice;
  if (!isRecommend && !isAdvice) return null;

  return (
    <View className="shrink-0 gap-y-4 pt-4">
      <View className="h-px bg-line-neutral" />
      {isRecommend ? (
        <Text style={styles.text} className="text-body font-bold text-label-strong">
          추천 : {hint.text}
        </Text>
      ) : (
        <View className="flex-row items-center gap-x-2">
          <Ionicons
            name="help-circle"
            size={24}
            color={SEMANTIC_COLORS.label.alternative}
          />
          <Text style={styles.text} className="flex-1 text-body font-medium text-label-alternative">
            {hint.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { includeFontPadding: false },
});
