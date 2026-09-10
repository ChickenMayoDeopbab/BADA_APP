import apiClient from "./client";
import {
  ApiResponse,
  ApiResponseVoid,
  MyPageResponse,
  UpdateMyPageRequest,
} from "./types";

export const getMyPage = async (): Promise<ApiResponse<MyPageResponse>> => {
  const response = await apiClient.get<ApiResponse<MyPageResponse>>(
    "/api/v1/user/mypage",
  );
  return response.data;
};

export const patchMyPage = async (
  data: UpdateMyPageRequest,
): Promise<ApiResponseVoid> => {
  const response = await apiClient.patch<ApiResponseVoid>(
    "/api/v1/user/mypage",
    data,
  );
  return response.data;
};
