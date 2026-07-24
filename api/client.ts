import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  create
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { RefreshTokenResponse } from './types';

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
    if (isPublicAuthRequest(config.url)) return config;

    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !isPublicAuthRequest(originalRequest.url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('Refresh token is missing');

        const { data } = await axios.post<RefreshTokenResponse>(
          `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );

        await AsyncStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        router.replace("/auth/login");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
