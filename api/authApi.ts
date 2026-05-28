import apiClient from "./client";
import { ApiResponse, EmailVerificationRequest, EmailRequest, LoginRequest, SignUpRequest, LoginResponse } from "./types";

export const postSignup = async (
  data: SignUpRequest
): Promise<ApiResponse<null>> => {
  const response = await apiClient.post<ApiResponse<null>>(
    "/api/v1/auth/signup",
    data
  );

  return response.data;
};

export const postLogin = async (
  data: LoginRequest
): Promise<ApiResponse<LoginResponse>> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    "/api/v1/auth/login",
    data
  );

  return response.data;
};

export const postEmailSend = async (
  data: EmailRequest
): Promise<ApiResponse<null>> => {
  const response = await apiClient.post<ApiResponse<null>>(
    "/api/v1/auth/email/send",
    data
  );

  return response.data;
};

export const postEmailCheck = async (
  data: EmailVerificationRequest
): Promise<ApiResponse<null>> => {
  const response = await apiClient.post<ApiResponse<null>>(
    "/api/v1/auth/email/check",
    data
  );

  return response.data;
};

export const deleteSignout = async (): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>("/api/v1/auth/signout");
  return response.data;
};