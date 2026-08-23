/**
 * 시나리오별 훈련 횟수 더미 데이터.
 *
 * TODO: 서버 연동 필요.
 * AI 서버의 ScenarioInfo에는 훈련 횟수 필드가 없고, Spring의
 * GET /api/v1/training-records 목록 응답도 scenarioName만 내려주기 때문에
 * (scenarioId는 상세 응답에만 존재) 시나리오 단위 집계가 불가능하다.
 * ScenarioInfo에 training_count가 추가되면 이 파일을 삭제하고 해당 값을 사용한다.
 */

const DUMMY_TRAINING_COUNTS = [2, 3, 5, 1, 4, 7, 2, 6, 3, 5] as const;

/** 시나리오 ID로 항상 같은 더미 훈련 횟수를 반환 (렌더마다 값이 바뀌지 않도록 결정적으로 계산) */
export const getDummyTrainingCount = (scenarioId: number): number =>
  DUMMY_TRAINING_COUNTS[Math.abs(scenarioId) % DUMMY_TRAINING_COUNTS.length];
