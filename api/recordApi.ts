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
  console.log("요청 URL:", response.config.url, response.config.params);
  return response.data;
};

export const getTrainingRecordDetail = async (
  recordId: number,
): Promise<ApiResponse<TrainingRecordDetail>> => {
  const response = await apiClient.get<ApiResponse<TrainingRecordDetail>>(
    `/api/v1/training-records/${recordId}`,
  );
  console.log("[RecordDetail] audio URLs from server", {
    recordId,
    recordingUrl: response.data.data?.recordingUrl,
    positiveFeedbackAudioUrls:
      response.data.data?.positiveFeedbacks?.map((part) => part.audioUrl) ?? [],
  });
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
