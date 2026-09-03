import apiClient from "./client";
import {
  ApiResponseInAppNotificationListResponse,
  ApiResponseInAppNotificationResponse,
  ApiResponseNotificationSettingResponse,
  ApiResponseVoid,
  GetNotificationsParams,
  RegisterPushDeviceRequest,
  UpdateNotificationSettingRequest,
} from "./types";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

export const getNotifications = async (
  params: GetNotificationsParams = {},
  signal?: AbortSignal,
): Promise<ApiResponseInAppNotificationListResponse> => {
  const response = await apiClient.get<ApiResponseInAppNotificationListResponse>(
    NOTIFICATIONS_PATH,
    { params, signal },
  );
  return response.data;
};

export const markNotificationRead = async (
  notificationId: number,
): Promise<ApiResponseInAppNotificationResponse> => {
  const response = await apiClient.patch<ApiResponseInAppNotificationResponse>(
    `${NOTIFICATIONS_PATH}/${notificationId}/read`,
  );
  return response.data;
};

export const getNotificationSettings = async (
  signal?: AbortSignal,
): Promise<ApiResponseNotificationSettingResponse> => {
  const response =
    await apiClient.get<ApiResponseNotificationSettingResponse>(
      `${NOTIFICATIONS_PATH}/settings`,
      { signal },
    );
  return response.data;
};

export const updateNotificationSettings = async (
  request: UpdateNotificationSettingRequest,
): Promise<ApiResponseNotificationSettingResponse> => {
  const response =
    await apiClient.put<ApiResponseNotificationSettingResponse>(
      `${NOTIFICATIONS_PATH}/settings`,
      request,
    );
  return response.data;
};

export const registerPushDevice = async (
  request: RegisterPushDeviceRequest,
): Promise<ApiResponseVoid> => {
  const response = await apiClient.put<ApiResponseVoid>(
    `${NOTIFICATIONS_PATH}/devices`,
    request,
  );
  return response.data;
};

export const unregisterPushDevice = async (
  installationId: string,
): Promise<ApiResponseVoid> => {
  const response = await apiClient.delete<ApiResponseVoid>(
    `${NOTIFICATIONS_PATH}/devices/${encodeURIComponent(installationId)}`,
  );
  return response.data;
};
