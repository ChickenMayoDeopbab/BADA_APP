import {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  create,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  clearAuthTokens,
  getAccessToken,
} from '@/utils/authTokenStorage';
import { refreshAuthTokens } from './tokenApi';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const PUBLIC_AUTH_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/email/send',
  '/api/v1/auth/email/check',
  '/api/v1/auth/find-id',
  '/api/v1/auth/check/username',
  '/api/v1/auth/password',
  '/api/v1/auth/oauth/token',
]);

const isPublicAuthRequest = (url?: string) =>
  Boolean(url && PUBLIC_AUTH_PATHS.has(url));

const apiClient: AxiosInstance = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicAuthRequest(config.url)) {
      config.headers.delete('Authorization');
      return config;
    }

    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as
      | CustomAxiosRequestConfig
      | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshAuthTokens();

        originalRequest.headers.Authorization =
          `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch {
        // 인증이 만료되면 서버 등록 해제 API를 호출할 수 없으므로 FCM 토큰을
        // 직접 폐기해 이전 계정의 알림이 이 기기로 계속 오지 않게 합니다.
        const deletePushToken = import('@/services/pushNotifications')
          .then(({ deleteLocalPushToken }) => deleteLocalPushToken())
          .catch((pushError) => {
            console.warn('[Push] 인증 만료 후 FCM 토큰 삭제 실패', pushError);
          });

        await Promise.all([
          deletePushToken,
          clearAuthTokens(),
          AsyncStorage.removeItem('autoLogin'),
        ]);

        router.replace('/auth/login');
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
