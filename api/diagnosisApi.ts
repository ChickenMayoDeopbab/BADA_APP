import apiClient from "./client";
import {
  ApiResponse,
  DiagnosisSubmitRequest,
  Level,
  Question,
} from "./types";

/** 회원가입용 자가진단 질문을 조회합니다. */
export const getQuestion = async (): Promise<ApiResponse<Question[]>> => {
  const response = await apiClient.get<ApiResponse<Question[]>>(
    `/api/diagnosis/questions`,
    { params: { type: "SIGNUP" } },
  );
  return response.data;
};

/** 자가진단 답변을 제출하고 결과를 반환합니다. */
export const calculateLevel = async (
  request: DiagnosisSubmitRequest,
): Promise<ApiResponse<Level>> => {
  const response = await apiClient.post<ApiResponse<Level>>(
    `/api/diagnosis/submit`,
    request,
  );
  return response.data;
};
