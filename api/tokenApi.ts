import axios from "axios";
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

interface AccessTokenClaims {
  sub?: string;
}

let refreshPromise: Promise<AuthTokens> | null = null;

const requestTokenRefresh = async (): Promise<AuthTokens> => {
  const { accessToken, refreshToken } = await getAuthTokens();

  if (!accessToken || !refreshToken) {
    throw new Error("로그인 토큰이 없습니다.");
  }

  const { sub } = jwtDecode<AccessTokenClaims>(accessToken);
  const userId = Number(sub);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("토큰의 사용자 정보가 올바르지 않습니다.");
  }

  const request: RefreshTokenRequest = { refreshToken, userId };
  const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
    `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
    request,
  );
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
