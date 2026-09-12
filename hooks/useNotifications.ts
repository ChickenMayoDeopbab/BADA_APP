import {
  getNotifications,
  getNotificationSettings,
  markNotificationRead,
  updateNotificationSettings,
} from "@/api/notificationApi";
import {
  NotificationFilter,
  UpdateNotificationSettingRequest,
} from "@/api/types";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const NOTIFICATION_PAGE_SIZE = 20;

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (filter: NotificationFilter) =>
    ["notifications", "list", filter] as const,
  settings: ["notifications", "settings"] as const,
};

export const useNotifications = (filter: NotificationFilter) =>
  useInfiniteQuery({
    queryKey: notificationQueryKeys.list(filter),
    queryFn: ({ pageParam, signal }) =>
      getNotifications(
        { filter, page: pageParam, size: NOTIFICATION_PAGE_SIZE },
        signal,
      ).then(({ data }) => data),
    initialPageParam: 0,
    getNextPageParam: ({ notifications }) =>
      notifications.last ? undefined : notifications.number + 1,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
};

export const useNotificationSettings = () =>
  useQuery({
    queryKey: notificationQueryKeys.settings,
    queryFn: ({ signal }) =>
      getNotificationSettings(signal).then(({ data }) => data),
  });

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateNotificationSettingRequest) =>
      updateNotificationSettings(request),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(notificationQueryKeys.settings, data);
    },
  });
};
