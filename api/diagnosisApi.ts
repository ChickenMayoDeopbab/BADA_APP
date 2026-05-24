import apiClient from "./client";
import { Answer, ApiResponse, Level, Question } from "./types";

export const getQuestion = async (): Promise<ApiResponse<Question[]>> => {
  const response = await apiClient.get<ApiResponse<Question[]>>(`/api/diagnosis/questions`, {
    params: {type: 'SIGNUP'}
  });
  return response.data;
}

export const calculateLevel = async (answers: Answer): Promise<ApiResponse<Level>> => {
  const response = await apiClient.post<ApiResponse<Level>>(`/api/diagnosis/submit`, answers);
  return response.data;
}