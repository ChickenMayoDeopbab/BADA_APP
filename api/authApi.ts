import apiClient from "./client";
import { ApiResponse, EmailVerificationRequest, EmailRequest, LoginRequest, SignUpRequest, LoginResponse } from "./types";

export const postSignup = async (
  data: SignUpRequest
): Promise<void> => {
  await apiClient.post(
    "/api/v1/auth/signup",
    data
  );
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
): Promise<void> => {
  await apiClient.post(
    "/api/v1/auth/email/send",
    data
  );
};

export const postEmailCheck = async (
  data: EmailVerificationRequest
): Promise<void> => {
  await apiClient.post(
    "/api/v1/auth/email/check",
    data
  );
};

export const deleteSignout = async (): Promise<void> => {
  await apiClient.delete("/api/v1/auth/signout");
};