import apiClient from "./client";
import { isAxiosError } from "axios";
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
  return response.data;
};

export const getTrainingRecord = async (
  recordId: number,
): Promise<ApiResponseTrainingRecordDetailResponse> => {
  const response = await apiClient.get<ApiResponseTrainingRecordDetailResponse>(
    `/api/v1/training-records/${recordId}`,
  );
  if (__DEV__) {
    console.info("[AnxietyScore][DetailResponse]", {
      recordId: response.data.data.recordId,
      sessionId: response.data.data.sessionId,
      anxietyScore: response.data.data.anxietyScore,
    });
  }
  return response.data;
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
  if (__DEV__) {
    console.info("[AnxietyScore][SaveRequest]", {
      sessionId,
      score: request.score,
    });
  }

  try {
    const response = await apiClient.post<ApiResponseAnxietyScoreResponse>(
      `/api/v1/training-records/${sessionId}/anxiety-score`,
      request,
    );
    if (__DEV__) {
      console.info("[AnxietyScore][SaveResponse]", {
        httpStatus: response.status,
        data: response.data.data,
      });
    }
    return response.data;
  } catch (error) {
    if (__DEV__) {
      console.warn("[AnxietyScore][SaveFailed]", {
        sessionId,
        score: request.score,
        message: error instanceof Error ? error.message : String(error),
        ...(isAxiosError(error)
          ? {
              httpStatus: error.response?.status ?? null,
              responseData: error.response?.data ?? null,
            }
          : {}),
      });
    }
    throw error;
  }
};

export const getFeedback = async (
  params: GetFeedbackParams,
): Promise<FeedbackResponse> => {
  const response = await apiClient.get<FeedbackResponse>(
    "/api/v1/training-records/feedback",
    {
      params,
    },
  );
  return response.data;
};
