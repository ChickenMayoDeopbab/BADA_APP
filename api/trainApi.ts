import apiClient from "./client";
import aiApiClient from "./aiClient";
import {
  ApiResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  CustomScenarioResponse,
  CustomSessionRequest,
  ScenarioCategory,
  ExampleConversationResponse,
  ScenarioListResponse,
} from "./types";

/** 훈련 시나리오 목록 조회 */
export const getScenarios = async (category?: ScenarioCategory): Promise<ScenarioListResponse> => {
  const response = await aiApiClient.get<ScenarioListResponse>('/api/v1/scenario/scenarios', {
    params: category ? { category } : undefined,
  });
  return response.data;
};

/** 훈련 세션 생성 (Spring 서버) */
export const createSession = async (
  data: CreateSessionRequest
): Promise<CreateSessionResponse> => {
  const response = await apiClient.post<ApiResponse<CreateSessionResponse>>('/api/v1/session', data);
  return response.data.data;
};

/** 커스텀 시나리오 생성 (AI 서버) — scenario_id만 반환, 세션 생성은 별도로 createSession 호출 필요 */
export const createCustomScenario = async (
  data: CustomSessionRequest
): Promise<CustomScenarioResponse> => {
  const response = await aiApiClient.post<CustomScenarioResponse>('/api/v1/scenario/custom', data);
  return response.data;
};

export const getScenarioExample = async (
  scenarioId: string,
  signal?: AbortSignal,
): Promise<ExampleConversationResponse> => {
  const response = await aiApiClient.get<ExampleConversationResponse>(
    `/api/v1/scenario/${scenarioId}/example`,
    { signal },
  );
  return response.data;
};
