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

const isAuthRequest = (url?: string) => url?.startsWith('/api/v1/auth/');
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
    if (isAuthRequest(config.url)) {
      config.headers.delete('Authorization');
      return config;
    }

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
      !originalRequest._retry &&
      !isAuthRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const { data } = await axios.post<RefreshTokenResponse>(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        await AsyncStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        router.push("/auth/login")
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
