import { Audio, AVPlaybackStatus } from "expo-av";
import { useEffect, useRef, useState } from "react";

export function useAudioSegment(url: string, startTime: number, endTime: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const endedRef = useRef(true);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.positionMillis >= endTime * 1000) {
      soundRef.current?.pauseAsync();
      endedRef.current = true;
      setIsPlaying(false);
    }
  };

  const toggle = async () => {
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (soundRef.current) {
      if (endedRef.current) {
        await soundRef.current.setPositionAsync(startTime * 1000);
        endedRef.current = false;
      }
      await soundRef.current.playAsync();
      setIsPlaying(true);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { positionMillis: startTime * 1000, shouldPlay: true },
      onPlaybackStatusUpdate
    );
    soundRef.current = sound;
    endedRef.current = false;
    setIsPlaying(true);
  };

  const stop = async () => {
    await soundRef.current?.pauseAsync();
    await soundRef.current?.setPositionAsync(startTime * 1000);
    endedRef.current = true;
    setIsPlaying(false);
  };

  return { isPlaying, toggle, stop };
}