import apiClient from "./client";
import type {
  ApiResponse,
  CreateTrainingCallScheduleRequest,
  CreateSessionResponse,
  TrainingCallScheduleResponse,
} from "./types";

const SCHEDULES_PATH = "/api/v1/training-call-schedules";

/** 서버에 발신 시간 범위를 등록해 앱 종료 후에도 예약을 유지한다. */
export const createTrainingCallSchedule = async (
  request: CreateTrainingCallScheduleRequest,
) => {
  const { data } = await apiClient.post<
    ApiResponse<TrainingCallScheduleResponse>
  >(SCHEDULES_PATH, request);
  if (
    !data.data?.scheduleId ||
    !["SCHEDULED", "RINGING"].includes(data.data.status)
  ) {
    throw new Error("발신 예약을 확인하지 못했어요. 다시 시도해 주세요.");
  }
  return data.data;
};

/** 수신 중인 예약이 없으면 data가 생략되는 응답도 null로 처리한다. */
export const getRingingTrainingCallSchedule = async (signal?: AbortSignal) => {
  const { data } = await apiClient.get<
    ApiResponse<TrainingCallScheduleResponse | null>
  >(`${SCHEDULES_PATH}/ringing`, { signal });
  return data.data ?? null;
};

/** 예약을 수락하고 유효한 통화 세션을 반환한다. */
export const acceptTrainingCallSchedule = async (
  scheduleId: number,
): Promise<CreateSessionResponse> => {
  const { data } = await apiClient.post<
    ApiResponse<TrainingCallScheduleResponse>
  >(`${SCHEDULES_PATH}/${scheduleId}/accept`);
  const accepted = data.data;
  if (
    accepted?.status !== "ACCEPTED" ||
    !accepted.sessionId ||
    !accepted.wsUrl
  ) {
    throw new Error("예약 통화 세션을 받지 못했어요. 다시 시도해 주세요.");
  }
  return { sessionId: accepted.sessionId, wsUrl: accepted.wsUrl };
};

/** 예약을 취소하거나 수신 중인 전화를 거절한다. */
export const cancelTrainingCallSchedule = async (
  scheduleId: number,
): Promise<void> => {
  await apiClient.delete(`${SCHEDULES_PATH}/${scheduleId}`);
};
