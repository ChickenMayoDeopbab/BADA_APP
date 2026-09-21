import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import apiClient from "./client";
import {
  ApiResponse,
  ChangePasswordRequest,
  CheckUsernameRequest,
  EmailSendRequest,
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

  // iOS 심사에서는 앱 안에서 표시되는 Safari View Controller를 사용한다.
  // bada://auth/callback 딥 링크는 Expo Router가 콜백 화면으로 전달한다.
  if (Platform.OS === "ios") {
    await WebBrowser.openBrowserAsync(url);
    return;
  }

  // Android는 Custom Tabs 인증 세션을 사용한다.
  await WebBrowser.openAuthSessionAsync(
    url,
    Linking.createURL("auth/callback", { scheme: "bada" }),
  );

  // Android는 Linking 이벤트로 Expo Router가 콜백 화면을 연다.
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
  data: EmailSendRequest
): Promise<void> => {
  await apiClient.post("/api/v1/auth/email/send", data);
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

export const deleteWithdraw = async (): Promise<void> => {
  await apiClient.delete("/api/v1/auth/withdraw");
};

export const deleteSignout = async (): Promise<void> => {
  await apiClient.delete("/api/v1/auth/signout");
};
