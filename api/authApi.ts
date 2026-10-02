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
  OAuthTokenResponse,
  SignUpRequest,
} from "./types";

const OAUTH_LOGIN_PATHS: Record<OAuthProvider, string> = {
  google: "/api/v1/auth/google",
  naver: "/api/v1/auth/naver",
  apple: "/api/v1/auth/apple",
};

const ANDROID_CALLBACK_GRACE_PERIOD_MS = 1_000;

/** Android 브라우저가 앱을 먼저 활성화한 뒤 보내는 늦은 딥 링크를 기다린다. */
const waitForAndroidOAuthCallback = async (
  loginUrl: string,
  redirectUrl: string,
): Promise<string | undefined> => {
  let receivedCallbackUrl: string | undefined;
  let resolveCallback: (url: string) => void = () => undefined;
  const callbackPromise = new Promise<string>((resolve) => {
    resolveCallback = resolve;
  });
  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (url !== redirectUrl && !url.startsWith(`${redirectUrl}?`)) return;

    receivedCallbackUrl = url;
    resolveCallback(url);
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      loginUrl,
      redirectUrl,
    );
    if (result.type === "success") return result.url;
    if (receivedCallbackUrl) return receivedCallbackUrl;

    return await new Promise<string | undefined>((resolve) => {
      const timeout = setTimeout(
        () => resolve(undefined),
        ANDROID_CALLBACK_GRACE_PERIOD_MS,
      );
      void callbackPromise.then((url) => {
        clearTimeout(timeout);
        resolve(url);
      });
    });
  } finally {
    subscription.remove();
  }
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
  // 브라우저별 앱 활성화/딥 링크 순서 차이까지 처리한 콜백 URL을 반환한다.
  return waitForAndroidOAuthCallback(
    url,
    Linking.createURL("auth/callback", { scheme: "bada" }),
  );
};

export const getGoogleLogin = (): Promise<string | undefined> =>
  openOAuthLogin("google");

export const getNaverLogin = (): Promise<string | undefined> =>
  openOAuthLogin("naver");

export const getAppleLogin = (): Promise<string | undefined> =>
  openOAuthLogin("apple");

export const postOAuthToken = async (
  data: OAuthCodeRequest,
): Promise<ApiResponse<OAuthTokenResponse>> => {
  const response = await apiClient.post<ApiResponse<OAuthTokenResponse>>(
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
