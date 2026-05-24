import apiClient from "./client";
import { ApiResponse, Question } from "./types";

export const getQuestion = async (): Promise<ApiResponse<Question[]>> => {
  const response = await apiClient.get<ApiResponse<Question[]>>(`/api/diagnosis/questions`, {
    params: {type: 'SIGNUP'}
  });
  return response.data;
}