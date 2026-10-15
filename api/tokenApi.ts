import axios, { isAxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import {
  getAuthTokens,
  setAuthTokens,
  type AuthTokens,
} from "@/utils/authTokenStorage";
import {
  ApiResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "./types";
import { AuthSessionExpiredError } from "@/utils/authSessionError";

interface AccessTokenClaims {
  sub?: string;
}

let refreshPromise: Promise<AuthTokens> | null = null;

const requestTokenRefresh = async (): Promise<AuthTokens> => {
  const { accessToken, refreshToken } = await getAuthTokens();

  if (!accessToken || !refreshToken) {
    throw new AuthSessionExpiredError();
  }

  let userId: number;
  try {
    const { sub } = jwtDecode<AccessTokenClaims>(accessToken);
    userId = Number(sub);
  } catch {
    throw new AuthSessionExpiredError();
  }

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AuthSessionExpiredError();
  }

  const request: RefreshTokenRequest = { refreshToken, userId };
  const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
    `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
    request,
    { timeout: 10_000 },
  ).catch((error: unknown) => {
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      throw new AuthSessionExpiredError();
    }
    // 네트워크·서버 장애는 재시도할 수 있도록 기존 토큰을 유지한다.
    throw error;
  });
  const nextTokens = response.data.data;

  if (!nextTokens?.accessToken || !nextTokens.refreshToken) {
    throw new Error("토큰 갱신 응답이 올바르지 않습니다.");
  }

  await setAuthTokens(nextTokens);

  return nextTokens;
};

export const refreshAuthTokens = (): Promise<AuthTokens> => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};
