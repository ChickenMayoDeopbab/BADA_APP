import apiClient from "./client";
import {
  ApiResponseInAppNotificationListResponse,
  ApiResponseInAppNotificationResponse,
  GetNotificationsParams,
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
