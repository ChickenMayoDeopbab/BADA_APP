import { InAppNotificationResponse, NotificationFilter } from "@/api/types";
import EmptyNotificationIcon from "@/assets/notifications/empty-notification.svg";
import Top from "@/components/common/Top";
import { SEMANTIC_COLORS } from "@/design-system";
import { useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDistanceToNowStrict } from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

const DefaultProfileImage = require("@/assets/notifications/default-profile-1.png");
const TrainingProfileImage = require("@/assets/notifications/default-profile-2.png");

function FilterChip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-1 rounded-[8px] px-4 py-1.5 ${selected ? "bg-neutral-20" : "bg-neutral-90"}`}
    >
      <Text className={`text-body font-medium ${selected ? "text-neutral-97" : "text-label-alternative"}`}>
        {label}
      </Text>
      {count !== undefined && (
        <View className="w-4 items-center">
          <Text className="text-center text-body font-bold text-[#09C357]">
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: InAppNotificationResponse;
  onPress: () => void;
}) {
  const fallbackImage = item.scheduleId ? TrainingProfileImage : DefaultProfileImage;
  const profileImage = item.actorProfileImage
    ? { uri: item.actorProfileImage }
    : fallbackImage;
  const time = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.message}`}
      onPress={onPress}
      className="h-[82px] w-full justify-center overflow-hidden rounded-[12px] bg-background-normal px-6 py-2.5 shadow-sm"
    >
      <View className="flex-row items-center gap-2.5">
        <Image source={profileImage} className="size-10 rounded-full bg-[#E0E0E0]" />
        <View className="flex-1 gap-1">
          <View className="w-full flex-row items-center justify-between">
            <Text className="text-body font-bold text-label-normal">{item.title}</Text>
            <Text className={`text-label font-medium ${item.read ? "text-line-normal" : "text-primary-normal"}`}>
              {time}
            </Text>
          </View>
          <Text className={`text-body text-label-normal ${item.read ? "font-regular" : "font-medium"}`}>
            {item.message}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const notificationsQuery = useNotifications(filter);
  const markReadMutation = useMarkNotificationRead();
  const notifications = notificationsQuery.data?.pages.flatMap(
    (page) => page.notifications.content,
  ) ?? [];
  const unreadCount = notificationsQuery.data?.pages[0]?.unreadCount ?? 0;
  const openNotification = (item: InAppNotificationResponse) => {
    const openPost = () => {
      if (!item.postId) return;

      router.push({
        pathname: "/(tabs)/(community)/post/[id]",
        params: { id: String(item.postId), source: "notifications" },
      });
    };

    if (item.read) {
      openPost();
      return;
    }

    markReadMutation.mutate(item.notificationId, {
      onSuccess: openPost,
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <StatusBar style="dark" backgroundColor={SEMANTIC_COLORS.background.normal} />
      <Top title="알림" back />

      <View className="flex-1 bg-background-alternative">
        <View className="flex-row gap-2 px-[34px] pt-[15px]">
          <FilterChip label="전체" selected={filter === "ALL"} onPress={() => setFilter("ALL")} />
          <FilterChip
            label="안읽음"
            count={unreadCount}
            selected={filter === "UNREAD"}
            onPress={() => setFilter("UNREAD")}
          />
        </View>

      {notificationsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center pb-20">
          <ActivityIndicator color={SEMANTIC_COLORS.primary.normal} />
        </View>
      ) : notificationsQuery.isError ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <Ionicons name="alert-circle-outline" size={40} color={SEMANTIC_COLORS.status.error} />
          <Text className="mt-3 text-body font-medium text-label-neutral">알림을 불러오지 못했어요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void notificationsQuery.refetch()}
            className="mt-4 rounded-[8px] bg-primary-normal px-6 py-2"
          >
            <Text className="text-label font-bold text-label-buttonText">재시도</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.notificationId)}
          contentContainerClassName={`gap-1.5 px-[11px] pb-8 pt-4 ${notifications.length === 0 ? "flex-grow justify-center" : ""}`}
          showsVerticalScrollIndicator={false}
          refreshing={notificationsQuery.isRefetching && !notificationsQuery.isFetchingNextPage}
          onRefresh={() => void notificationsQuery.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
              void notificationsQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              onPress={() => openNotification(item)}
            />
          )}
          ListEmptyComponent={(
            <View className="items-center justify-center pb-20">
              <EmptyNotificationIcon width={36} height={40} />
              <Text className="mt-2 text-body font-medium text-label-alternative opacity-50">
                표시할 알림이 없어요.
              </Text>
            </View>
          )}
          ListFooterComponent={notificationsQuery.isFetchingNextPage ? (
            <ActivityIndicator className="py-5" color={SEMANTIC_COLORS.primary.normal} />
          ) : notifications.length > 0 ? (
            <Text className="py-8 text-center text-caption font-medium text-label-alternative opacity-50">
              받은 알림은 3일 동안 표시됩니다.
            </Text>
          ) : null}
        />
        )}
      </View>
    </View>
  );
}
