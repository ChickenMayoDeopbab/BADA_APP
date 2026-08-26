import { PALETTE, SEMANTIC_COLORS } from "@/design-system";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlaybackGroup } from "./AudioPlaybackGroup";

const WAVEFORM_HEIGHTS = [
  12, 31, 42, 26, 36, 20, 38, 29, 17, 14, 23, 41, 44, 40, 35, 32, 27, 38,
  40, 34, 22, 31, 19, 28, 16,
];
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_GAP = 2;
const WAVEFORM_WIDTH =
  WAVEFORM_HEIGHTS.length * WAVEFORM_BAR_WIDTH +
  (WAVEFORM_HEIGHTS.length - 1) * WAVEFORM_GAP;

const formatSegmentDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

interface AudioSegmentButtonProps {
  audioUrl: string;
  startTime: number;
  endTime: number;
}

export default function AudioSegmentButton({
  audioUrl,
  startTime,
  endTime,
}: AudioSegmentButtonProps) {
  const player = useAudioPlayer({ uri: audioUrl }, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const playbackGroup = useAudioPlaybackGroup();
  const segmentStart = Math.max(0, startTime);
  const segmentEnd = Math.max(segmentStart, endTime);
  const segmentDuration = segmentEnd - segmentStart;
  const currentSegmentProgress =
    segmentDuration > 0
      ? Math.min(
          1,
          Math.max(0, (status.currentTime - segmentStart) / segmentDuration),
        )
      : 0;
  const segmentProgress = status.playing
    ? Math.max(currentSegmentProgress, 1 / WAVEFORM_HEIGHTS.length)
    : currentSegmentProgress;
  const waveformHeights = useMemo(() => {
    const offset = Math.round(segmentStart) % WAVEFORM_HEIGHTS.length;
    return WAVEFORM_HEIGHTS.map(
      (_, index) =>
        WAVEFORM_HEIGHTS[(index + offset) % WAVEFORM_HEIGHTS.length],
    );
  }, [segmentStart]);

  useEffect(() => {
    return playbackGroup?.register(player.id, () => player.pause());
  }, [playbackGroup, player]);

  useEffect(() => {
    const reachedSegmentEnd =
      status.didJustFinish ||
      (status.playing && status.currentTime >= segmentEnd);
    if (!reachedSegmentEnd) return;

    player.pause();
  }, [
    player,
    segmentEnd,
    status.currentTime,
    status.didJustFinish,
    status.playing,
  ]);

  const handlePress = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    playbackGroup?.requestPlay(player.id);
    if (
      status.didJustFinish ||
      status.currentTime < segmentStart ||
      status.currentTime >= segmentEnd
    ) {
      await player.seekTo(segmentStart);
    }
    player.play();
  };

  return (
    <View
      className="flex-row items-center w-full h-[72px] px-3 rounded-[12px]"
      style={{ backgroundColor: "#E6F7ED" }}
    >
      <TouchableOpacity
        className="items-center justify-center w-12 h-12 rounded-full"
        style={{ backgroundColor: "#09C357" }}
        activeOpacity={0.8}
        disabled={!status.isLoaded}
        onPress={handlePress}
      >
        {!status.isLoaded ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={24}
            color="#FFFFFF"
            style={status.playing ? undefined : { marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      <View className="items-center justify-center flex-1 h-12 mx-3 overflow-hidden">
        <View
          className="relative flex-row items-center h-12 gap-x-[2px]"
          style={{ width: WAVEFORM_WIDTH }}
        >
          {waveformHeights.map((height, index) => {
            const barProgress = Math.min(
              1,
              Math.max(0, segmentProgress * waveformHeights.length - index),
            );

            return (
              <View
                key={`${height}-${index}`}
                className="overflow-hidden rounded-full"
                style={{
                  width: WAVEFORM_BAR_WIDTH,
                  height,
                  backgroundColor: SEMANTIC_COLORS.line.normal,
                }}
              >
                <View
                  className="h-full"
                  style={{
                    width: `${barProgress * 100}%`,
                    backgroundColor: PALETTE.green[40],
                  }}
                />
              </View>
            );
          })}
          {segmentProgress > 0 && segmentProgress < 1 && (
            <View
              pointerEvents="none"
              className="absolute top-0 bottom-0 w-0.5"
              style={{
                left: `${segmentProgress * 100}%`,
                backgroundColor: PALETTE.green[40],
              }}
            />
          )}
        </View>
      </View>

      <Text className="font-medium text-body text-label-alternative">
        {formatSegmentDuration(segmentDuration)}
      </Text>
    </View>
  );
}
