/**
 * 난이도 / 태도 슬라이더는 왼쪽(쉬움)에서 오른쪽(어려움) 순서로 배치한다.
 * 라벨 배열과 서버 enum 배열의 인덱스는 항상 1:1로 대응해야 한다.
 */
export const DIFFICULTY_LABELS = ["하", "중", "상"] as const;
export const ATTITUDE_LABELS = ["친절", "보통", "까다로움", "진상"] as const;

export const DIFFICULTY_MAP = ["low", "medium", "high"] as const;
export const SPRING_PERSONALITY_MAP = ["KIND", "NORMAL", "TOUGH", "RUDE"] as const;

/** 발신 시간(분) 휠 피커에서 고를 수 있는 범위 */
export const CALL_DELAY_MINUTES = Array.from({ length: 61 }, (_, minute) => minute);

/**
 * 시나리오 카테고리. value는 서버 ScenarioCategory enum을 그대로 쓴다.
 * 목록 필터 칩과 커스텀 시나리오 생성 드롭다운이 같은 목록을 공유한다.
 */
export const SCENARIO_CATEGORIES = [
  { value: "work", label: "업무" },
  { value: "daily", label: "일상" },
  { value: "school", label: "학교" },
  { value: "other", label: "기타" },
] as const;

/**
 * 훈련 종료 직후 불안 점수 입력 전에 순서대로 보여주는 안내 메시지.
 * face는 assets에 있는 이모지 SVG 키를 가리킨다.
 * 줄바꿈(\n)은 디자인에 지정된 위치 그대로다. 자동 줄바꿈에 맡기면
 * "골라주 / 면 돼요!"처럼 단어 중간에서 끊긴다.
 */
export const TRAIN_END_MESSAGES = [
  { face: "thinking", text: "이번 전화는 어땠나요?" },
  { face: "thinking", text: "어때요?\n지난 번보다 괜찮아진 것 같나요?" },
  { face: "grinning", text: "그렇지 않아도 괜찮아요!" },
  { face: "grinning", text: "바다와 함께라면\n두려움이 사라질거라 믿어요!" },
  { face: "winking", text: "자, 이제\n이번 훈련이 어땠는지 알려줄래요?" },
  { face: "winking", text: "불안 점수를\n0-10 중 하나로 골라주면 돼요!" },
] as const;

/** 안내 메시지 한 글자가 타이핑되는 간격(ms) */
export const TRAIN_END_MESSAGE_TYPING_MS = 45;

/** 타이핑이 끝난 뒤 다음 메시지로 넘어가기까지 머무는 시간(ms) */
export const TRAIN_END_MESSAGE_HOLD_MS = 900;

/**
 * 불안 점수 막대 10칸의 색상.
 * 편안함(초록) → 매우 불안(빨강)으로 이어지며, 선택한 점수까지의 막대만 칠한다.
 */
export const ANXIETY_SCORE_COLORS = [
  "#04B868",
  "#04B868",
  "#39C06C",
  "#7BC560",
  "#BAC14E",
  "#F5A624",
  "#EF9229",
  "#E95C3C",
  "#DF4748",
  "#D54254",
] as const;

/** 불안 점수 최댓값 (서버 스펙상 0 이상 10 이하) */
export const ANXIETY_SCORE_MAX = 10;

/**
 * 시나리오 목록 필터 칩.
 * value가 null이면 카테고리 필터를 걸지 않는다(전체).
 * 커스텀 시나리오는 카테고리가 아니라 is_custom으로 구분해 별도 탭에 노출한다.
 */
export const SCENARIO_CATEGORY_CHIPS = [
  { value: null, label: "전체" },
  ...SCENARIO_CATEGORIES,
] as const;

/** 시나리오 목록 탭 (기본 제공 / 직접 만든 커스텀 / 공유받은 복사본) */
export const SCENARIO_TABS = [
  { value: "basic", label: "기본 제공" },
  { value: "custom", label: "커스텀" },
  { value: "shared", label: "공유받은" },
] as const;

export type ScenarioTabValue = (typeof SCENARIO_TABS)[number]["value"];
