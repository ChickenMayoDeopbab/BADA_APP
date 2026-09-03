import { AxiosInstance, InternalAxiosRequestConfig, create } from 'axios';
import { getAccessToken } from '@/utils/authTokenStorage';

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

export default aiApiClient;
