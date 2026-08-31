import { PALETTE, SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ProfileImage1 = require("@/assets/notifications/default-profile-1.png");
const ProfileImage2 = require("@/assets/notifications/default-profile-2.png");

type NotificationFilter = "all" | "unread";

type NotificationItem = {
  id: number;
  title: string;
  time: string;
  message: string;
  unread: boolean;
  profileImage: ImageSourcePropType;
};

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: "조상철",
    time: "1분 전",
    message: "내 글에 댓글을 작성했어요.",
    unread: true,
    profileImage: ProfileImage1,
  },
  {
    id: 2,
    title: "시나리오 훈련",
    time: "3분 전",
    message: "3분~6분 후 시나리오 훈련이 시작돼요.",
    unread: true,
    profileImage: ProfileImage2,
  },
  {
    id: 3,
    title: "이도연",
    time: "7시간 전",
    message: "내 글에 좋아요를 눌렀어요.",
    unread: false,
    profileImage: ProfileImage1,
  },
  {
    id: 4,
    title: "전수안",
    time: "1일 전",
    message: "내 글에 댓글을 작성했어요.",
    unread: false,
    profileImage: ProfileImage1,
  },
  {
    id: 5,
    title: "박준석",
    time: "1일 전",
    message: "내 글에 댓글을 작성했어요.",
    unread: false,
    profileImage: ProfileImage1,
  },
];

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
        <Text className="text-body font-bold text-[#09C357]">{count}</Text>
      )}
    </Pressable>
  );
}

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <View className="h-[82px] w-full justify-center rounded-[12px] bg-background-normal px-6 py-2.5 shadow-sm">
      <View className="flex-row items-center gap-2.5">
        <Image source={item.profileImage} className="size-10 rounded-full bg-[#E0E0E0]" />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-body font-bold text-label-normal">{item.title}</Text>
            <Text className={`text-label font-medium ${item.unread ? "text-primary-normal" : "text-line-normal"}`}>
              {item.time}
            </Text>
          </View>
          <Text className={`text-body text-label-normal ${item.unread ? "font-medium" : "font-regular"}`}>
            {item.message}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const filteredNotifications = filter === "all"
    ? NOTIFICATIONS
    : NOTIFICATIONS.filter(({ unread }) => unread);
  const unreadCount = NOTIFICATIONS.filter(({ unread }) => unread).length;

  return (
    <SafeAreaView className="flex-1 bg-background-alternative" edges={["top"]}>
      <View className="h-16 flex-row items-center justify-between bg-background-normal px-2">
        <Pressable
          accessibilityLabel="뒤로 가기"
          hitSlop={8}
          onPress={() => router.back()}
          className="size-16 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={32} color={PALETTE.common[100]} />
        </Pressable>
        <Text className="text-headline1 font-bold text-label-neutral">알림</Text>
        <View className="size-16" />
      </View>

      <View className="flex-row gap-2 px-[34px] pt-[15px]">
        <FilterChip label="전체" selected={filter === "all"} onPress={() => setFilter("all")} />
        <FilterChip
          label="안읽음"
          count={unreadCount}
          selected={filter === "unread"}
          onPress={() => setFilter("unread")}
        />
      </View>

      {filteredNotifications.length === 0 ? (
        <View className="flex-1 items-center justify-center pb-20">
          <Ionicons name="notifications-off-outline" size={22} color={SEMANTIC_COLORS.label.alternative} />
          <Text className="mt-2 text-body font-medium text-label-alternative opacity-50">
            표시할 알림이 없어요.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="items-center gap-1.5 px-[11px] pb-8 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.map((item) => <NotificationCard key={item.id} item={item} />)}
          <Text className="py-8 text-caption font-medium text-label-alternative opacity-50">
            받은 알림은 3일 동안 표시됩니다.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
