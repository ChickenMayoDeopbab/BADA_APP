import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAudioPlaybackGroup } from "./audio/AudioPlaybackGroup";

interface SeekableAudioPlayerProps {
  audioUrl?: string | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatTime = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.round(seconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function SeekableAudioPlayer({
  audioUrl,
}: SeekableAudioPlayerProps) {
  const normalizedUrl = audioUrl?.trim() ?? "";
  const source = useMemo(
    () => (normalizedUrl ? { uri: normalizedUrl } : null),
    [normalizedUrl],
  );
  const player = useAudioPlayer(source, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const playbackGroup = useAudioPlaybackGroup();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const durationRef = useRef(0);
  const canPlayRef = useRef(false);
  const playerRef = useRef(player);

  const duration = Math.max(0, status.duration || 0);
  const displayedTime = dragTime ?? status.currentTime;
  const progress = duration > 0 ? clamp(displayedTime / duration, 0, 1) : 0;
  const canPlay = Boolean(normalizedUrl && status.isLoaded && duration > 0);
  durationRef.current = duration;
  canPlayRef.current = canPlay;
  playerRef.current = player;

  useEffect(() => {
    return playbackGroup?.register(player.id, () => player.pause());
  }, [playbackGroup, player]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canPlayRef.current,
        onMoveShouldSetPanResponder: () => canPlayRef.current,
        onPanResponderGrant: (event) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;
          const ratio = clamp(
            (event.nativeEvent.pageX - trackPageXRef.current) / width,
            0,
            1,
          );
          setDragTime(ratio * durationRef.current);
        },
        onPanResponderMove: (_, gestureState) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;
          const ratio = clamp(
            (gestureState.moveX - trackPageXRef.current) / width,
            0,
            1,
          );
          setDragTime(ratio * durationRef.current);
        },
        onPanResponderRelease: async (event, gestureState) => {
          const width = trackWidthRef.current;
          const pageX = gestureState.moveX || event.nativeEvent.pageX;
          const ratio =
            width > 0
              ? clamp(
                  (pageX - trackPageXRef.current) / width,
                  0,
                  1,
                )
              : 0;
          const nextTime = ratio * durationRef.current;
          setDragTime(null);
          try {
            await playerRef.current.seekTo(nextTime);
            setErrorMessage(null);
          } catch (error) {
            console.error("[SeekableAudioPlayer] seek 실패", error);
            setErrorMessage("재생 위치를 변경하지 못했습니다.");
          }
        },
        onPanResponderTerminate: () => setDragTime(null),
      }),
    [],
  );

  const togglePlayback = async () => {
    if (!canPlay) return;

    try {
      if (status.playing) {
        player.pause();
      } else {
        playbackGroup?.requestPlay(player.id);
        if (status.didJustFinish || status.currentTime >= duration) {
          await player.seekTo(0);
        }
        player.play();
      }
      setErrorMessage(null);
    } catch (error) {
      console.error("[SeekableAudioPlayer] 재생 실패", error);
      setErrorMessage("오디오를 재생하지 못했습니다.");
    }
  };

  return (
    <View className="w-full">
      <View className="flex-row items-center gap-x-3">
        <TouchableOpacity
          disabled={!canPlay}
          onPress={togglePlayback}
          activeOpacity={0.7}
        >
          {!normalizedUrl || status.isLoaded ? (
            <Ionicons
              name={status.playing ? "pause-circle" : "play-circle-sharp"}
              size={44}
              color={canPlay ? "#0AE365" : "#BDBEBE"}
            />
          ) : (
            <View className="items-center justify-center w-11 h-11">
              <ActivityIndicator color="#0AE365" />
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1">
          <View
            ref={trackRef}
            className="justify-center h-11"
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              trackWidthRef.current = width;
              trackRef.current?.measureInWindow((x) => {
                trackPageXRef.current = x;
              });
            }}
            {...panResponder.panHandlers}
          >
            <View className="h-1 bg-[#D9D9D9] rounded-full overflow-hidden">
              <View
                className="h-full bg-[#0AE365] rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
            <View
              className="absolute w-4 h-4 bg-[#0AE365] rounded-full"
              style={{ left: `${progress * 100}%`, transform: [{ translateX: -8 }] }}
            />
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-xs text-[#8C8E8E]">
              {formatTime(displayedTime)}
            </Text>
            <Text className="text-xs text-[#8C8E8E]">
              {formatTime(duration)}
            </Text>
          </View>
        </View>
      </View>

      {!normalizedUrl && (
        <Text className="mt-1 text-xs text-[#F65C5C]">
          재생할 녹음 파일이 없습니다.
        </Text>
      )}
      {errorMessage && (
        <Text className="mt-1 text-xs text-[#F65C5C]">{errorMessage}</Text>
      )}
    </View>
  );
}
