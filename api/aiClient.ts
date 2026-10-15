import { AxiosInstance, InternalAxiosRequestConfig, create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  clearAuthTokens,
  getAccessToken,
} from '@/utils/authTokenStorage';
import { refreshAuthTokens } from './tokenApi';
import { AuthSessionExpiredError } from '@/utils/authSessionError';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const aiApiClient: AxiosInstance = create({
  baseURL: process.env.EXPO_PUBLIC_AI_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

aiApiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

aiApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | CustomAxiosRequestConfig
      | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshAuthTokens();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return aiApiClient(originalRequest);
      } catch (refreshError) {
        if (!(refreshError instanceof AuthSessionExpiredError)) {
          return Promise.reject(refreshError);
        }
        await Promise.all([
          clearAuthTokens(),
          AsyncStorage.removeItem('autoLogin'),
        ]);
        router.replace('/auth/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default aiApiClient;
