import apiClient from "./client";
import {
  ApiResponse,
  ChangePasswordRequest,
  CheckUsernameRequest,
  EmailRequest,
  EmailVerificationRequest,
  FindIdRequest,
  FindIdResponse,
  LoginRequest,
  LoginResponse,
  SignUpRequest,
} from "./types";

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

export const postFindId = async (
  data: FindIdRequest
): Promise<ApiResponse<FindIdResponse>> => {
  const response = await apiClient.post<ApiResponse<FindIdResponse>>(
    "/api/v1/auth/find-id",
    data
  );

  return response.data;
};

export const postCheckUsername = async (
  data: CheckUsernameRequest
): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.post<ApiResponse<boolean>>(
    "/api/v1/auth/check/username",
    data
  );

  return response.data;
};

export const patchPassword = async (
  data: ChangePasswordRequest
): Promise<void> => {
  await apiClient.patch("/api/v1/auth/password", data);
};

export const deleteSignout = async (): Promise<void> => {
  await apiClient.delete("/api/v1/auth/signout");
};
