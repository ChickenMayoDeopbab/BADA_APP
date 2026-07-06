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
): Promise<ApiResponse<TrainingFeedbackResponse>> => {
  const response = await apiClient.get<ApiResponse<TrainingFeedbackResponse>>(
    "/api/v1/training-records/feedback",
    { params: { recordId } },
  );
  return response.data;
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
        const feedbackResponse = await getTrainingRecordFeedback(recordId);
        return feedbackResponse.data;
      }
    } catch (error) {}

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error("훈련 결과 생성에 시간이 오래 걸리고 있습니다.");
};
