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

/** 페이지가 이동하지 않도록 읽지 않은 알림 ID를 먼저 수집한 뒤 모두 읽음 처리한다. */
export const markAllNotificationsRead = async (): Promise<void> => {
  const notificationIds = new Set<number>();
  let page = 0;
  while (true) {
    const { data } = await getNotifications({ filter: "UNREAD", page, size: 100 });
    for (const item of data.notifications.content) {
      if (!item.read) notificationIds.add(item.notificationId);
    }
    if (data.notifications.last || data.notifications.content.length === 0) break;
    page += 1;
  }

  const ids = [...notificationIds];
  let hasFailures = false;
  for (let index = 0; index < ids.length; index += 5) {
    const results = await Promise.allSettled(
      ids.slice(index, index + 5).map(markNotificationRead),
    );
    if (results.some((result) => result.status === "rejected")) hasFailures = true;
  }
  if (hasFailures) {
    throw new Error("일부 알림을 읽음 처리하지 못했어요. 다시 시도해 주세요.");
  }
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
