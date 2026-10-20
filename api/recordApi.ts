import apiClient from "./client";
import { CanceledError, isAxiosError } from "axios";
import { getCompletedCallDuration } from "@/utils/completedCallDuration";
import {
  ApiResponseAnxietyScoreResponse,
  ApiResponsePageTrainingRecordResponse,
  ApiResponseTrainingRecordDetailResponse,
  ApiResponseVoid,
  FeedbackResponse,
  GetFeedbackParams,
  GetTrainingRecordsParams,
  RecordAnxietyScoreRequest,
} from "./types";

export const getTrainingRecords = async (
  params: GetTrainingRecordsParams = {},
): Promise<ApiResponsePageTrainingRecordResponse> => {
  const { page, size } = params;
  const response = await apiClient.get<ApiResponsePageTrainingRecordResponse>(
    "/api/v1/training-records",
    { params: { page, size } },
  );
  const records = response.data.data.content;
  const completedDurations = await Promise.all(
    records.map((record) => getCompletedCallDuration(record.sessionId)),
  );
  return {
    ...response.data,
    data: {
      ...response.data.data,
      content: records.map((record, index) => ({
        ...record,
        durationSeconds: completedDurations[index] ?? record.durationSeconds,
      })),
    },
  };
};

export const getTrainingRecord = async (
  recordId: number,
): Promise<ApiResponseTrainingRecordDetailResponse> => {
  const response = await apiClient.get<ApiResponseTrainingRecordDetailResponse>(
    `/api/v1/training-records/${recordId}`,
  );
  const completedDuration = await getCompletedCallDuration(
    response.data.data.sessionId,
  );
  return completedDuration === null
    ? response.data
    : {
        ...response.data,
        data: {
          ...response.data.data,
          durationSeconds: completedDuration,
        },
      };
};

export const deleteTrainingRecord = async (
  recordId: number,
): Promise<ApiResponseVoid> => {
  const response = await apiClient.delete<ApiResponseVoid>(
    `/api/v1/training-records/${recordId}`,
  );
  return response.data;
};

export const postAnxietyScore = async (
  sessionId: string,
  request: RecordAnxietyScoreRequest,
): Promise<ApiResponseAnxietyScoreResponse> => {
  const response = await apiClient.post<ApiResponseAnxietyScoreResponse>(
    `/api/v1/training-records/${sessionId}/anxiety-score`,
    request,
  );
  return response.data;
};

const FEEDBACK_POLL_INTERVAL_MS = 2000;
const FEEDBACK_WAIT_TIMEOUT_MS = 120000;

/** 분석이 제한 시간 안에 끝나지 않았을 때 재시도 안내를 표시한다. */
export class FeedbackWaitTimeoutError extends Error {
  constructor() {
    super("훈련 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
    this.name = "FeedbackWaitTimeoutError";
  }
}

class FeedbackNotReadyError extends Error {}

/** 피드백 단건을 조회하며 서버가 명시한 처리 중 응답은 완료 결과와 구분한다. */
export const getFeedback = async (
  params: GetFeedbackParams,
  options: { signal?: AbortSignal; timeout?: number } = {},
): Promise<FeedbackResponse> => {
  const response = await apiClient.get<FeedbackResponse>(
    "/api/v1/training-records/feedback",
    {
      params,
      ...options,
    },
  );
  if (response.status === 202 || response.status === 204) {
    throw new FeedbackNotReadyError();
  }
  return response.data;
};

/** 서버의 기록 생성 대기와 일시적인 연결 실패만 재조회 대상으로 구분한다. */
const canRetryFeedback = (error: unknown): boolean => {
  if (error instanceof FeedbackNotReadyError) return true;
  if (!isAxiosError<{ error?: { code?: string } }>(error)) return false;
  if (!error.response) {
    return ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(error.code ?? "");
  }
  return error.response.status === 404 &&
    error.response.data?.error?.code === "TRAINING_RECORD_001";
};

/** 화면을 떠나면 대기 타이머도 즉시 취소한다. */
const waitForFeedbackPoll = (duration: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CanceledError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, duration);
    const handleAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(new CanceledError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
  });

/** 통화 결과가 저장될 때까지 순차 조회하고, 시간 초과·화면 이탈 시 중단한다. */
export const waitForFeedback = async (
  params: GetFeedbackParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<FeedbackResponse> => {
  const deadline = Date.now() + FEEDBACK_WAIT_TIMEOUT_MS;
  while (true) {
    if (signal?.aborted) throw new CanceledError();
    const remainingTime = deadline - Date.now();
    if (remainingTime <= 0) throw new FeedbackWaitTimeoutError();
    try {
      return await getFeedback(params, {
        signal,
        timeout: Math.min(10000, remainingTime),
      });
    } catch (error) {
      if (signal?.aborted) throw new CanceledError();
      if (!canRetryFeedback(error)) throw error;
    }
    await waitForFeedbackPoll(
      Math.min(FEEDBACK_POLL_INTERVAL_MS, Math.max(0, deadline - Date.now())),
      signal,
    );
  }
};
