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
        await Promise.all([
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
