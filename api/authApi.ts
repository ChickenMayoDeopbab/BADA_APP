import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
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
  OAuthCodeRequest,
  OAuthProvider,
  SignUpRequest,
} from "./types";

const OAUTH_LOGIN_PATHS: Record<OAuthProvider, string> = {
  google: "/api/v1/auth/google",
  naver: "/api/v1/auth/naver",
  apple: "/api/v1/auth/apple",
};

export const getOAuthLoginUrl = (provider: OAuthProvider): string => {
  const url = apiClient.getUri({
    url: OAUTH_LOGIN_PATHS[provider],
  });

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("EXPO_PUBLIC_API_URL이 설정되지 않았습니다.");
  }

  return url;
};

export const openOAuthLogin = async (
  provider: OAuthProvider
): Promise<string | undefined> => {
  const url = getOAuthLoginUrl(provider);

  if (Platform.OS === "web") {
    await Linking.openURL(url);
    return;
  }

  // 서버의 최종 리다이렉트는 bada://auth/callback?code=... 입니다.
  // iOS는 ASWebAuthenticationSession, Android는 Custom Tabs를 사용합니다.
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    Linking.createURL("auth/callback", { scheme: "bada" }),
  );

  // Android는 Linking 이벤트로 Expo Router가 콜백 화면을 엽니다.
  // iOS는 인증 세션이 URL을 반환하므로 호출 화면에서 직접 이동합니다.
  if (result.type === "success" && Platform.OS === "ios") {
    return result.url;
  }
};

export const getGoogleLogin = (): Promise<string | undefined> =>
  openOAuthLogin("google");

export const getNaverLogin = (): Promise<string | undefined> =>
  openOAuthLogin("naver");

export const getAppleLogin = (): Promise<string | undefined> =>
  openOAuthLogin("apple");

export const postOAuthToken = async (
  data: OAuthCodeRequest,
): Promise<ApiResponse<LoginResponse>> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    "/api/v1/auth/oauth/token",
    data,
  );

  return response.data;
};

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
