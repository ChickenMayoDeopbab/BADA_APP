import aiApiClient from "./aiClient";
import {
  CreateSessionRequest,
  CreateSessionResponse,
  CustomSessionRequest,
  CustomSessionResponse,
  ScenarioCategory,
  ScenarioListResponse,
} from "./types";

/** 훈련 시나리오 목록 조회 */
export const getScenarios = async (category?: ScenarioCategory): Promise<ScenarioListResponse> => {
  const response = await aiApiClient.get<ScenarioListResponse>('/api/v1/scenario/scenarios', {
    params: category ? { category } : undefined,
  });
  return response.data;
};

/** 프리셋 시나리오로 훈련 세션 생성 */
export const createSession = async (
  data: CreateSessionRequest
): Promise<CreateSessionResponse> => {
  const response = await aiApiClient.post<CreateSessionResponse>('/api/v1/scenario/sessions', data);
  return response.data;
};

/** 커스텀 훈련 세션 생성 */
export const createCustomSession = async (
  data: CustomSessionRequest
): Promise<CustomSessionResponse> => {
  const response = await aiApiClient.post<CustomSessionResponse>('/api/v1/scenario/sessions/custom', data);
  return response.data;
};
