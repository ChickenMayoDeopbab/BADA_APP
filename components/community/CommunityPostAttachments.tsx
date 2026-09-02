import { postCopyCommunityScenario } from "@/api/communityApi";
import { getApiErrorMessage } from "@/api/error";
import type {
  CommunityPostAttachment,
  CommunityScenarioCopyResponse,
} from "@/api/types";
import CustomModal from "@/components/common/CustomModal";
import StyledImage from "@/components/common/StyledImage";
import GradientOverlay from "@/components/train/GradientOverlay";
import { CARD_TEXT_SHADOW } from "@/components/train/cardTextShadow";
import { SEMANTIC_COLORS } from "@/design-system";
import { getScenarioCover } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SCENARIO_SCRIM = [
  { color: "#000000", opacity: 0.68, offset: "0%" },
  { color: "#000000", opacity: 0.34, offset: "52%" },
  { color: "#000000", opacity: 0.06, offset: "100%" },
];

type ImageAttachmentShape = CommunityPostAttachment & {
  image_url?: string | null;
  file_url?: string | null;
  url?: string | null;
  file?: {
    url?: string | null;
    file_url?: string | null;
    mime_type?: string | null;
  } | null;
};

const getImageUrl = (attachment: CommunityPostAttachment): string | null => {
  const candidate = attachment as ImageAttachmentShape;
  return (
    candidate.image_url?.trim() ||
    candidate.file_url?.trim() ||
    candidate.url?.trim() ||
    candidate.file?.url?.trim() ||
    candidate.file?.file_url?.trim() ||
    null
  );
};

const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const formatRecordDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const getRecordIcon = (
  sessionType?: string | null,
): keyof typeof Ionicons.glyphMap => {
  const normalizedSessionType = sessionType?.toUpperCase();
  if (normalizedSessionType === "WARMUP") return "flame";
  if (normalizedSessionType === "CUSTOM") return "create";
  return "chatbubbles";
};

interface TrainingRecordCardProps {
  attachment: CommunityPostAttachment;
}

function TrainingRecordCard({ attachment }: TrainingRecordCardProps) {
  const record = attachment.training_record;
  const normalizedUrl = record?.audio_url?.trim() ?? "";
  const source = useMemo(
    () => (normalizedUrl ? { uri: normalizedUrl } : null),
    [normalizedUrl],
  );
  const player = useAudioPlayer(source, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const sheenProgress = useRef(new Animated.Value(0)).current;
  const [cardWidth, setCardWidth] = useState(342);
  const duration = Math.max(
    0,
    status.duration || record?.duration_seconds || 0,
  );
  const canPlay = Boolean(
    normalizedUrl && record?.is_available !== false && status.isLoaded,
  );

  useEffect(() => {
    if (!status.playing) {
      sheenProgress.stopAnimation();
      sheenProgress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(sheenProgress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [sheenProgress, status.playing]);

  const togglePlayback = async () => {
    if (!canPlay) return;

    try {
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish || status.currentTime >= duration) {
          await player.seekTo(0);
        }
        player.play();
      }
    } catch (error) {
      console.error("[CommunityTrainingRecord] 재생 실패", error);
    }
  };

  if (!record) return null;

  const isPlaying = status.playing;
  const primaryTextColor = isPlaying ? "#FFFFFF" : SEMANTIC_COLORS.label.normal;
  const secondaryTextColor = isPlaying
    ? "rgba(255,255,255,0.88)"
    : SEMANTIC_COLORS.label.alternative;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          normalizedUrl
            ? `${record.scenario_name ?? "훈련 기록"} 음성 ${isPlaying ? "일시정지" : "재생"}`
            : `${record.scenario_name ?? "훈련 기록"} 훈련 기록`
        }
        accessibilityState={{ disabled: !canPlay, selected: isPlaying }}
        disabled={!canPlay}
        onPress={() => void togglePlayback()}
        onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
        className="h-[72px] overflow-hidden rounded-component bg-background-normal px-3"
        style={styles.cardShadow}
      >
        {isPlaying && (
          <>
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: SEMANTIC_COLORS.primary.normal },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.playingSheen,
                {
                  transform: [
                    {
                      translateX: sheenProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-90, cardWidth + 90],
                      }),
                    },
                    { skewX: "-18deg" },
                  ],
                },
              ]}
            />
          </>
        )}

        <View className="flex-1 flex-row items-center gap-x-2.5">
          <View
            className="h-10 w-10 items-center justify-center rounded-[8px]"
            style={{
              backgroundColor: isPlaying
                ? "rgba(255,255,255,0.22)"
                : SEMANTIC_COLORS.record.iconBackground,
            }}
          >
            {!status.isLoaded && normalizedUrl ? (
              <ActivityIndicator size="small" color={primaryTextColor} />
            ) : (
              <Ionicons
                name={getRecordIcon(record.session_type)}
                size={22}
                color={
                  isPlaying
                    ? "#FFFFFF"
                    : canPlay
                      ? SEMANTIC_COLORS.status.info
                      : SEMANTIC_COLORS.line.normal
                }
              />
            )}
          </View>

          <View className="flex-1 justify-center">
            <View className="flex-row items-center justify-between gap-x-2">
              <Text
                numberOfLines={1}
                className="flex-1 text-body font-bold"
                style={{ color: primaryTextColor }}
              >
                {record.scenario_name ?? "훈련 기록"}
              </Text>
              <Text className="text-caption" style={{ color: secondaryTextColor }}>
                {formatRecordDate(record.started_at)}
              </Text>
            </View>
            <Text className="mt-1 text-caption" style={{ color: secondaryTextColor }}>
              {formatDuration(duration)}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

interface ScenarioCardProps {
  postId: number;
  attachment: CommunityPostAttachment;
}

interface ScenarioSaveNotice {
  title: string;
  description: string;
  tone: "success" | "error";
}

function ScenarioCard({ postId, attachment }: ScenarioCardProps) {
  const queryClient = useQueryClient();
  const scenario = attachment.scenario;
  const [copyResult, setCopyResult] =
    useState<CommunityScenarioCopyResponse | null>(null);
  const [saveNotice, setSaveNotice] = useState<ScenarioSaveNotice | null>(
    null,
  );
  const copyMutation = useMutation({
    mutationFn: () => postCopyCommunityScenario(postId),
    onSuccess: (result) => {
      setCopyResult(result);
      void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setSaveNotice({
        title: result.already_copied
          ? "이미 저장된 시나리오예요"
          : "시나리오를 저장했어요",
        description: `시나리오 훈련의 공유받은 탭에서 ${result.title}을 확인할 수 있어요.`,
        tone: "success",
      });
    },
    onError: (error) => {
      setSaveNotice({
        title: "시나리오를 저장하지 못했어요",
        description: getApiErrorMessage(
          error,
          "잠시 후 다시 시도해주세요.",
        ),
        tone: "error",
      });
    },
  });

  if (!scenario) return null;

  const isUnavailable = scenario.is_available === false;
  const isSaved = Boolean(copyResult) || scenario.is_mine;
  const buttonLabel = copyMutation.isPending
    ? "저장 중..."
    : isSaved
      ? "저장됨"
      : "저장하기";

  const closeSaveNotice = () => setSaveNotice(null);

  return (
    <>
      <View
        className="h-[72px] overflow-hidden rounded-component bg-background-normal"
        style={styles.cardShadow}
      >
        <StyledImage
          source={getScenarioCover(undefined, scenario.category)}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <GradientOverlay
          direction="right"
          stops={SCENARIO_SCRIM}
        />

        <View className="flex-1 flex-row items-center justify-between px-3 py-2.5">
          <View className="flex-1 pr-2">
            <Text
              numberOfLines={1}
              className="text-headline1 font-bold text-white"
              style={CARD_TEXT_SHADOW}
            >
              {scenario.title}
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1 text-caption text-white"
              style={CARD_TEXT_SHADOW}
            >
              {scenario.content || "함께 연습해 볼 수 있는 시나리오예요."}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${scenario.title} 저장하기`}
            accessibilityState={{ disabled: isUnavailable || isSaved }}
            disabled={isUnavailable || isSaved || copyMutation.isPending}
            onPress={() => copyMutation.mutate()}
            className="h-9 min-w-[92px] flex-row items-center justify-center gap-x-0.5 rounded-[8px] border border-white/30 bg-black/20 px-2.5 active:opacity-80"
          >
            {copyMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-body font-medium text-white">
                  {buttonLabel}
                </Text>
                {!isSaved && (
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                )}
              </>
            )}
          </Pressable>
        </View>
      </View>

      <CustomModal
        visible={Boolean(saveNotice)}
        title={saveNotice?.title ?? ""}
        description={saveNotice?.description}
        icon={
          saveNotice ? (
            <View
              className={`h-12 w-12 items-center justify-center rounded-pill ${
                saveNotice.tone === "success"
                  ? "bg-green-90"
                  : "bg-red-90"
              }`}
            >
              <Ionicons
                name={
                  saveNotice.tone === "success"
                    ? "checkmark"
                    : "alert"
                }
                size={28}
                color={
                  saveNotice.tone === "success"
                    ? SEMANTIC_COLORS.primary.normal
                    : SEMANTIC_COLORS.status.error
                }
              />
            </View>
          ) : null
        }
        onClose={closeSaveNotice}
        primaryAction={{
          label: "확인",
          tone: saveNotice?.tone === "error" ? "neutral" : "primary",
          onPress: closeSaveNotice,
        }}
      />
    </>
  );
}

interface ImageAttachmentCardProps {
  imageUrl: string;
  onOpen: () => void;
}

function ImageAttachmentCard({ imageUrl, onOpen }: ImageAttachmentCardProps) {
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="첨부 사진 크게 보기"
      onPress={onOpen}
      className="h-[164px] overflow-hidden rounded-component bg-fill-neutral active:opacity-90"
      style={styles.cardShadow}
    >
      <StyledImage
        source={{ uri: imageUrl }}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
    </Pressable>
  );
}

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  return (
    <Modal
      visible={Boolean(imageUrl)}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/95">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진 닫기"
          onPress={onClose}
          className="absolute inset-0"
        />
        {imageUrl && (
          <StyledImage
            source={{ uri: imageUrl }}
            contentFit="contain"
            className="mx-4 my-20 flex-1"
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진 닫기"
          hitSlop={8}
          onPress={onClose}
          className="absolute right-5 top-14 h-12 w-12 items-center justify-center rounded-component border border-white/10 bg-neutral-20"
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

interface CommunityPostAttachmentsProps {
  postId: number;
  attachments?: CommunityPostAttachment[];
}

export default function CommunityPostAttachments({
  postId,
  attachments = [],
}: CommunityPostAttachmentsProps) {
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const trainingRecordAttachment = attachments.find(
    (attachment) => attachment.kind === "TRAINING_RECORD",
  );
  const scenarioAttachment = attachments.find(
    (attachment) => attachment.kind === "SCENARIO",
  );
  const imageUrl = attachments.map(getImageUrl).find(Boolean) ?? null;

  if (
    !trainingRecordAttachment &&
    !scenarioAttachment &&
    !imageUrl
  ) {
    return null;
  }

  return (
    <>
      <View className="mt-4 gap-y-2.5">
        {trainingRecordAttachment && (
          <TrainingRecordCard attachment={trainingRecordAttachment} />
        )}
        {scenarioAttachment && (
          <ScenarioCard postId={postId} attachment={scenarioAttachment} />
        )}
        {imageUrl && (
          <ImageAttachmentCard
            imageUrl={imageUrl}
            onOpen={() => setViewerImageUrl(imageUrl)}
          />
        )}
      </View>
      <ImageViewer
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 3.4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  playingSheen: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 72,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
});
