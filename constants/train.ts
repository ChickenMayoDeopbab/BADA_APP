export const DIFFICULTY_LABELS = ["상", "중", "하"] as const;
export const ATTITUDE_LABELS = ["친절", "보통", "까다로움", "진상"] as const;

export const DIFFICULTY_MAP = ["high", "medium", "low"] as const;
export const SPRING_PERSONALITY_MAP = ["KIND", "NORMAL", "TOUGH", "RUDE"] as const;

/**
 * 시나리오 카테고리 칩 목록.
 * 라벨만 한글이고 value는 서버 enum(ScenarioCategory)을 그대로 사용한다.
 * value가 null이면 카테고리 필터를 걸지 않는다(전체).
 * custom은 커스텀 탭에서 따로 노출되므로 칩에서 제외한다.
 */
export const SCENARIO_CATEGORY_CHIPS = [
  { value: null, label: "전체" },
  { value: "restaurant", label: "식당" },
  { value: "hospital", label: "병원" },
  { value: "complaint", label: "민원" },
  { value: "delivery", label: "배달" },
  { value: "bank", label: "은행" },
] as const;

/** 시나리오 목록 탭 (기본 제공 / 커스텀) */
export const SCENARIO_TABS = [
  { value: "basic", label: "기본 제공" },
  { value: "custom", label: "커스텀" },
] as const;

export type ScenarioTabValue = (typeof SCENARIO_TABS)[number]["value"];
