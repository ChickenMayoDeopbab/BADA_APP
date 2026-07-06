import { formatSecondsToMMSS } from "@/utils/formatTime";
import { useAudioSegment } from "@/hooks/useAudioSegment";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlaybackGroup } from "../audio/AudioPlaybackGroup";

interface BestPartProps {
  summary: string;
  startTime: number;
  endTime: number;
  url: string;
}

const formatTime = (seconds: number): string => {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function BestPart({
  summary,
  startTime,
  endTime,
  url,
}: BestPartProps) {
  const player = useAudioPlayer({ uri: url }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const playbackGroup = useAudioPlaybackGroup();

  useEffect(() => {
    return playbackGroup?.register(player.id, () => player.pause());
  }, [playbackGroup, player]);

  useEffect(() => {
    if (!status.playing || status.currentTime < endTime) return;

    player.pause();
    player.seekTo(startTime).catch((error) => {
      console.error("[BestPart] 재생 위치 초기화 실패", error);
    });
  }, [endTime, player, startTime, status.currentTime, status.playing]);

  const handlePress = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    playbackGroup?.requestPlay(player.id);
    if (status.currentTime < startTime || status.currentTime >= endTime) {
      await player.seekTo(startTime);
    }
    player.play();
  };

  return (
    <View className="flex-row items-center justify-between p-3 bg-white rounded-xl">
      <View className="flex-1 ml-[10px] mr-3">
        <Text className="text-base font-medium text-[#3B3D3E]" numberOfLines={2}>
          {summary}
        </Text>
        <Text className="text-[#BDBEBE] font-medium text-sm mt-1">
          {formatTime(startTime)} ~ {formatTime(endTime)}
        </Text>
      </View>
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
    </View>
  );
}
