import { SEMANTIC_COLORS } from "@/design-system";
import type { CommunityAttachment } from "@/types/community";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, Text, View } from "react-native";

interface CommunityAttachmentCardProps {
  attachment: CommunityAttachment;
  compact?: boolean;
  onRemove?: () => void;
}

export default function CommunityAttachmentCard({
  attachment,
  compact = false,
  onRemove,
}: CommunityAttachmentCardProps) {
  if (compact) {
    const label =
      attachment.type === "scenario"
        ? "커스텀 시나리오"
        : attachment.type === "record"
          ? "훈련 기록"
          : "파일";
    const value =
      attachment.type === "file"
        ? attachment.name
        : attachment.type === "record"
          ? `${attachment.title} (${attachment.date.slice(2).replaceAll("-", ".")} ${attachment.time.replace("오후 ", "")})`
          : attachment.title;

    return (
      <View className="h-7 flex-row items-center justify-between px-2">
        <View className="flex-row items-center gap-x-1.5">
          <Ionicons
            name={
              attachment.type === "scenario"
                ? "videocam"
                : attachment.type === "record"
                  ? "time"
                  : "document"
            }
            size={14}
            color={SEMANTIC_COLORS.label.alternative}
          />
          <Text className="text-caption text-label-alternative">{label}</Text>
        </View>
        <View className="max-w-[70%] flex-row items-center gap-x-2">
          <Text numberOfLines={1} className="text-label font-medium text-label-normal">
            {value}
          </Text>
          {onRemove && (
            <Pressable hitSlop={8} onPress={onRemove}>
              <Ionicons
                name="trash"
                size={19}
                color={SEMANTIC_COLORS.line.normal}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (attachment.type === "record") {
    return (
      <View
        className="h-16 flex-row items-center justify-between rounded-component bg-background-normal px-3"
        style={{
          shadowColor: "#000000",
          shadowOpacity: 0.06,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 0 },
          elevation: 1,
        }}
      >
        <View className="flex-row items-center gap-x-2.5">
          <View className="h-11 w-11 items-center justify-center rounded-component bg-[#E7F2FA]">
            <Text className="text-[26px]">{attachment.emoji}</Text>
          </View>
          <View>
            <Text className="text-headline2 font-bold text-label-normal">
              {attachment.title}
            </Text>
            <Text className="text-caption text-label-alternative">
              {attachment.duration} · 피드백 {attachment.feedbackCount}개
            </Text>
          </View>
        </View>
        <Text className="text-caption text-line-normal">{attachment.time}</Text>
      </View>
    );
  }

  if (attachment.type === "scenario") {
    return (
      <View className="h-16 overflow-hidden rounded-component bg-label-normal">
        <Image
          source={attachment.image}
          resizeMode="cover"
          style={{ width: "100%", height: "100%", position: "absolute" }}
        />
        <View className="absolute inset-0 bg-black/25" />
        <View className="flex-1 flex-row items-center justify-between px-4">
          <View>
            <Text className="text-headline2 font-medium text-white">
              {attachment.title}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-x-1">
              <Ionicons name="time-outline" size={14} color="white" />
              <Text className="text-caption text-white">
                {attachment.trainingCount}회
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-x-1 rounded-control border border-white/40 bg-black/20 px-2.5 py-1.5">
            <Text className="text-label font-medium text-white">저장하기</Text>
            <Ionicons name="chevron-forward" size={15} color="white" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="h-12 flex-row items-center gap-x-2 rounded-component bg-background-normal px-3">
      <Ionicons
        name="document"
        size={18}
        color={SEMANTIC_COLORS.label.alternative}
      />
      <Text className="text-label font-medium text-label-normal">
        {attachment.name}
      </Text>
    </View>
  );
}
