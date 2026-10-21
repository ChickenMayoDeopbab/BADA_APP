import { getScenarioExample } from "@/api/trainApi";
import type { ScriptHint, TranscriptTurn } from "@/hooks/useTrainWebSocket";
import { useQuery } from "@tanstack/react-query";

interface UseInitialScriptHintProps {
  scenarioId?: string;
  isEnabled: boolean;
  scriptLevel: number | null;
  transcript: TranscriptTurn[];
  scriptHint: ScriptHint | null;
}

/** AI 첫 인사 뒤에는 같은 예시 대화의 첫 사용자 답변을 보여주고 이후 서버 힌트를 우선한다. */
export function useInitialScriptHint({
  scenarioId,
  isEnabled,
  scriptLevel,
  transcript,
  scriptHint,
}: UseInitialScriptHintProps) {
  const hasUserReplied = transcript.some((turn) => turn.role === "user");
  const canUseInitialHint = isEnabled && !!scenarioId && scriptLevel === 1 &&
    scriptHint === null && !hasUserReplied;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["scenario-example", scenarioId],
    queryFn: ({ signal }) => getScenarioExample(scenarioId!, signal),
    enabled: canUseInitialHint,
    staleTime: 5 * 60 * 1000,
  });
  const initialReply = data?.dialogue.find(
    (turn) => turn.speaker === "user" && turn.text.trim(),
  )?.text.trim();
  const hasAiGreeting = transcript.some((turn) => turn.role === "ai");
  const shouldShowInitialHint = canUseInitialHint && hasAiGreeting;

  return {
    hint: scriptHint ?? (shouldShowInitialHint && initialReply
      ? { level: 1, text: initialReply }
      : null),
    isLoading: shouldShowInitialHint && isPending,
    hasError: shouldShowInitialHint && isError,
    retry: refetch,
  };
}
