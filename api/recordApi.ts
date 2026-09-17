import apiClient from "./client";
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
