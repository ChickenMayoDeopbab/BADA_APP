import type { Level } from "@/api/types";

/** Reject unusable results and tolerate missing optional explanatory text. */
export const normalizeDiagnosisResult = (value: unknown): Level => {
  const result = value as Partial<Level> | null;
  if (!result || typeof result.levelName !== "string" || !result.levelName.trim()
    || typeof result.score !== "number" || !Number.isFinite(result.score)) {
    throw new Error("자가진단 결과를 확인할 수 없습니다.");
  }
  return {
    score: result.score,
    levelName: result.levelName,
    summary: typeof result.summary === "string" ? result.summary : "",
    levelDescription: typeof result.levelDescription === "string" ? result.levelDescription : "",
  };
};
