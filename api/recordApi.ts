import apiClient from "./client";
import {
  ApiResponse,
  GetTrainingRecordsParams,
  PageData,
  TrainingFeedbackResponse,
  TrainingRecordDetail,
  TrainingRecordItem,
} from "./types";

export const getTrainingRecords = async (
  params: GetTrainingRecordsParams,
): Promise<ApiResponse<PageData<TrainingRecordItem>>> => {
  const response = await apiClient.get<
    ApiResponse<PageData<TrainingRecordItem>>
  >("/api/v1/training-records", { params });
  return response.data;
};

export const getTrainingRecordDetail = async (
  recordId: number,
): Promise<ApiResponse<TrainingRecordDetail>> => {
  const response = await apiClient.get<ApiResponse<TrainingRecordDetail>>(
    `/api/v1/training-records/${recordId}`,
  );
  return response.data;
};

export const getTrainingRecordFeedback = async (
  recordId: number,
  scenarioId?: string,
): Promise<TrainingFeedbackResponse> => {
  const response = await apiClient.get<
    ApiResponse<TrainingFeedbackResponse> | TrainingFeedbackResponse
  >("/api/v1/training-records/feedback", {
    params: { recordId, scenarioId },
  });
  const body = response.data;

  return "data" in body ? body.data : body;
};


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
          sort: "trainedAt,desc",
        });
        const record = recordsResponse.data.content.find(
          (item) => item.sessionId === sessionId,
        );
        recordId = record?.recordId ?? null;
      }

      if (recordId != null) {
        const detailResponse = await getTrainingRecordDetail(recordId);
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
