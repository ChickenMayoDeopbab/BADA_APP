import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { useAudioPlaybackGroup } from "./AudioPlaybackGroup";

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
    <TouchableOpacity disabled={!status.isLoaded} onPress={handlePress}>
      {!status.isLoaded ? (
        <ActivityIndicator size="small" color="#0AE365" />
      ) : (
        <Ionicons
          name={status.playing ? "pause-circle" : "play-circle-sharp"}
          size={40}
          color="#0AE365"
        />
      )}
    </TouchableOpacity>
  );
}
