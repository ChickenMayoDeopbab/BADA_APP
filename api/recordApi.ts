import apiClient from "./client";
import {
  ApiResponseAnxietyScoreResponse,
  ApiResponsePageTrainingRecordResponse,
  ApiResponseTrainingRecordDetailResponse,
  ApiResponseVoid,
  FeedbackResponse,
  GetTrainingRecordFeedbackParams,
  GetTrainingRecordsParams,
  RecordAnxietyScoreRequest,
  TrainingFeedbackResponse,
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

export const getTrainingRecordDetail = getTrainingRecord;

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

export const getTrainingRecordFeedback = async (
  params: GetTrainingRecordFeedbackParams,
): Promise<FeedbackResponse> => {
  const response = await apiClient.get<FeedbackResponse>(
    "/api/v1/training-records/feedback",
    {
      params,
    },
  );
  return response.data;
};

export const getFeedback = getTrainingRecordFeedback;

export const getTrainingFeedbackBySessionId = async (
  sessionId: string,
): Promise<TrainingFeedbackResponse> => {
  const maxAttempts = 15;
  let recordId: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (recordId == null) {
        const recordsResponse = await getTrainingRecords({
          page: 0,
          size: 20,
        });
        const record = recordsResponse.data.content.find(
          (item) => item.sessionId === sessionId,
        );
        recordId = record?.recordId ?? null;
      }

      if (recordId != null) {
        const detailResponse = await getTrainingRecord(recordId);
        const detail = detailResponse.data;
        const totalSeconds = Math.max(0, Math.round(detail.durationSeconds));

        return {
          sessionType: detail.sessionType,
          scenarioName: detail.scenarioName,
          trainingTime: {
            hour: Math.floor(totalSeconds / 3600),
            minute: Math.floor((totalSeconds % 3600) / 60),
            second: totalSeconds % 60,
            nano: 0,
          },
          goodSegments: detail.positiveFeedbacks.map((part) => ({
            start: part.startSecond,
            end: part.endSecond,
            good_point: part.good_point,
          })),
          recordingUrl: detail.recordingUrl,
        };
      }
    } catch {}

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error("훈련 결과 생성에 시간이 오래 걸리고 있습니다.");
};
