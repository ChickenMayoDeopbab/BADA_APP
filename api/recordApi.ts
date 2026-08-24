import apiClient from "./client";
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

export const recordAnxietyScore = async (
  sessionId: string,
  request: RecordAnxietyScoreRequest,
): Promise<ApiResponseAnxietyScoreResponse> => {
  const response = await apiClient.post<ApiResponseAnxietyScoreResponse>(
    `/api/v1/training-records/${sessionId}/anxiety-score`,
    request,
  );
  return response.data;
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
