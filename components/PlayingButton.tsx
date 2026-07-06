import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlaybackGroup } from "./audio/AudioPlaybackGroup";

type AudioUrlState = {
  isMissing: boolean;
  isEmpty: boolean;
  isHttps: boolean;
  expiresAt: string | null;
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
    return {
      isMissing: true,
      isEmpty: false,
      isHttps: false,
      expiresAt: null,
      isExpired: null,
    };
  }

  const trimmedUrl = audioUrl.trim();
  if (!trimmedUrl) {
    return {
      isMissing: false,
      isEmpty: true,
      isHttps: false,
      expiresAt: null,
      isExpired: null,
    };
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
  } catch (error) {
    console.error("[PlayingButton] audioUrl 파싱 실패", error, audioUrl);
  }

  return {
    isMissing: false,
    isEmpty: false,
    isHttps: /^https:\/\//i.test(trimmedUrl),
    expiresAt: expiresAt?.toISOString() ?? null,
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
    console.log("[PlayingButton] Audio 생성 / load 시작", {
      playerId: player.id,
      audioUrl: normalizedAudioUrl || audioUrl,
      audioUrlState,
    });
  }, [audioUrlState, audioUrl, normalizedAudioUrl, player.id]);

  useEffect(() => {
    console.log("[PlayingButton] status 변화", {
      playerId: player.id,
      playing: status?.playing,
      isLoaded: status?.isLoaded,
      error: statusError,
      loading,
      disabled,
      duration: status?.duration,
      playbackState: status?.playbackState,
      timeControlStatus: status?.timeControlStatus,
      reasonForWaitingToPlay: status?.reasonForWaitingToPlay,
      didJustFinish: status?.didJustFinish,
    });

    if (statusError) {
      console.error("[PlayingButton] status.error", statusError, {
        audioUrl: normalizedAudioUrl,
      });
      setErrorMessage(statusError);
    }
  }, [
    disabled,
    loading,
    normalizedAudioUrl,
    player.id,
    status?.didJustFinish,
    status?.duration,
    status?.isLoaded,
    status?.playbackState,
    status?.playing,
    status?.reasonForWaitingToPlay,
    status?.timeControlStatus,
    statusError,
  ]);

  useEffect(() => {
    if (status?.isLoaded) {
      console.log("[PlayingButton] load 완료", {
        playerId: player.id,
        duration: status.duration,
        audioUrl: normalizedAudioUrl,
      });
    }
  }, [normalizedAudioUrl, player.id, status?.duration, status?.isLoaded]);

  useEffect(() => {
    if (status?.didJustFinish) {
      console.log("[PlayingButton] 재생 완료", {
        playerId: player.id,
        audioUrl: normalizedAudioUrl,
      });
      player.seekTo(0).catch((error) => {
        console.error("[PlayingButton] 재생 위치 초기화 실패", error, {
          audioUrl: normalizedAudioUrl,
        });
      });
    }
  }, [normalizedAudioUrl, player, status?.didJustFinish]);

  const handlePress = () => {
    console.log("[PlayingButton] 버튼 클릭", {
      playerId: player.id,
      audioUrl,
      normalizedAudioUrl,
      audioUrlState,
      playing: status?.playing,
      isLoaded: status?.isLoaded,
      error: statusError,
      loading,
      disabled,
    });
    console.log("audioUrl", audioUrl);

    if (!normalizedAudioUrl) {
      setErrorMessage("재생할 오디오 URL이 없습니다");
      console.error("[PlayingButton] audioUrl 없음", {
        audioUrl,
        audioUrlState,
      });
      return;
    }

    if (!audioUrlState.isHttps) {
      console.error("[PlayingButton] HTTPS URL이 아닙니다", {
        audioUrl: normalizedAudioUrl,
        audioUrlState,
      });
    }

    if (audioUrlState.isExpired) {
      const message = "오디오 URL이 만료되었습니다";
      setErrorMessage(message);
      console.error("[PlayingButton] presigned URL 만료", {
        audioUrl: normalizedAudioUrl,
        expiresAt: audioUrlState.expiresAt,
      });
      return;
    }

    if (!status?.isLoaded) {
      const message = "오디오를 불러오는 중입니다";
      setErrorMessage(message);
      console.warn("[PlayingButton] play 중단: 아직 로드되지 않음", {
        audioUrl: normalizedAudioUrl,
        status,
      });
      return;
    }

    setErrorMessage(null);

    try {
      if (status?.playing) {
        console.log("[PlayingButton] pause 시작", {
          playerId: player.id,
          audioUrl: normalizedAudioUrl,
        });
        player.pause();
        console.log("[PlayingButton] pause 완료", {
          playerId: player.id,
          audioUrl: normalizedAudioUrl,
        });
      } else {
        playbackGroup?.requestPlay(player.id);
        console.log("[PlayingButton] play 시작", {
          playerId: player.id,
          audioUrl: normalizedAudioUrl,
        });
        player.play();
        console.log("[PlayingButton] play 완료", {
          playerId: player.id,
          audioUrl: normalizedAudioUrl,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PlayingButton] 오디오 재생 실패", error, {
        message,
        audioUrl: normalizedAudioUrl,
        status,
      });
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
