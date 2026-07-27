import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlaybackGroup } from "./audio/AudioPlaybackGroup";

type AudioUrlState = {
  isExpired: boolean | null;
};

const parseAwsDate = (value: string): Date | null => {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );
};

const getUrlState = (audioUrl?: string | null): AudioUrlState => {
  if (audioUrl == null) {
    return { isExpired: null };
  }

  const trimmedUrl = audioUrl.trim();
  if (!trimmedUrl) {
    return { isExpired: null };
  }

  let expiresAt: Date | null = null;

  try {
    const url = new URL(trimmedUrl);
    const epochExpires =
      url.searchParams.get("Expires") ?? url.searchParams.get("expires");
    const awsDate = url.searchParams.get("X-Amz-Date");
    const awsExpires = url.searchParams.get("X-Amz-Expires");

    if (epochExpires && /^\d+$/.test(epochExpires)) {
      expiresAt = new Date(Number(epochExpires) * 1000);
    } else if (awsDate && awsExpires && /^\d+$/.test(awsExpires)) {
      const signedAt = parseAwsDate(awsDate);
      if (signedAt) {
        expiresAt = new Date(
          signedAt.getTime() + Number(awsExpires) * 1000,
        );
      }
    }
  } catch {}

  return {
    isExpired: expiresAt ? expiresAt.getTime() <= Date.now() : null,
  };
};

function PlayingButton({ audioUrl }: { audioUrl?: string | null }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedAudioUrl = audioUrl?.trim() ?? "";
  const audioSource = useMemo(
    () => (normalizedAudioUrl ? { uri: normalizedAudioUrl } : null),
    [normalizedAudioUrl],
  );
  const player = useAudioPlayer(audioSource, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const playbackGroup = useAudioPlaybackGroup();
  const statusError = (status as { error?: string | null } | null)?.error;
  const audioUrlState = useMemo(() => getUrlState(audioUrl), [audioUrl]);
  const loading = Boolean(normalizedAudioUrl && !status?.isLoaded);
  const disabled = !normalizedAudioUrl;

  useEffect(() => {
    return playbackGroup?.register(player.id, () => player.pause());
  }, [playbackGroup, player]);


  useEffect(() => {
    if (statusError) setErrorMessage(statusError);
  }, [statusError]);


  const handlePress = () => {

    if (!normalizedAudioUrl) {
      setErrorMessage("재생할 오디오 URL이 없습니다");
      return;
    }

    if (audioUrlState.isExpired) {
      const message = "오디오 URL이 만료되었습니다";
      setErrorMessage(message);
      return;
    }

    if (!status?.isLoaded) {
      const message = "오디오를 불러오는 중입니다";
      setErrorMessage(message);
      return;
    }

    setErrorMessage(null);

    try {
      if (status?.playing) {
        player.pause();
      } else {
        playbackGroup?.requestPlay(player.id);
        player.play();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
    }
  };

  return (
    <View className="items-center">
      <View>
        <TouchableOpacity
          disabled={disabled}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={status?.playing ? "pause-circle" : "play-circle-sharp"}
            size={40}
            color={disabled ? "#BDBEBE" : "#0AE365"}
          />
        </TouchableOpacity>
        {loading && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size={18} color="#0AE365" />
          </View>
        )}
      </View>
      {errorMessage && (
        <Text className="text-[10px] text-[#F65C5C] mt-1 text-center max-w-[100px]">
          재생 실패: {errorMessage}
        </Text>
      )}
    </View>
  );
}

export { PlayingButton };
