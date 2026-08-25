import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlaybackGroup } from "./AudioPlaybackGroup";

const WAVEFORM_HEIGHTS = [
  12, 31, 42, 26, 36, 20, 38, 29, 17, 14, 23, 41, 44, 40, 35, 32, 27, 38,
  40, 34, 22, 31, 19, 28, 16,
];

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
  const player = useAudioPlayer({ uri: audioUrl }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const playbackGroup = useAudioPlaybackGroup();
  const segmentStart = Math.max(0, startTime);
  const segmentEnd = Math.max(segmentStart, endTime);
  const segmentDuration = segmentEnd - segmentStart;
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
    if (!status.playing || status.currentTime < segmentEnd) return;

    player.pause();
    player.seekTo(segmentStart).catch(() => {});
  }, [player, segmentEnd, segmentStart, status.currentTime, status.playing]);

  const handlePress = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    playbackGroup?.requestPlay(player.id);
    if (
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

      <View className="flex-row items-center justify-center flex-1 h-12 mx-3 gap-x-[2px] overflow-hidden">
        {waveformHeights.map((height, index) => (
          <View
            key={`${height}-${index}`}
            className="flex-1 rounded-full"
            style={{
              height,
              minWidth: 2,
              maxWidth: 3,
              backgroundColor: "#09C357",
            }}
          />
        ))}
      </View>

      <Text className="font-medium text-body text-label-alternative">
        {formatSegmentDuration(segmentDuration)}
      </Text>
    </View>
  );
}
