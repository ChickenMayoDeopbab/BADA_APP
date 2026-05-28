import apiClient from "./client";
import { ApiResponse, MyPageResponse } from "./types";

export const getMyPage = async (): Promise<ApiResponse<MyPageResponse>> => {
  const response = await apiClient.get<ApiResponse<MyPageResponse>>("/api/v1/user/mypage");
  return response.data;
};