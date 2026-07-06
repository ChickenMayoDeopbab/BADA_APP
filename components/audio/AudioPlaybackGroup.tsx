import { useFocusEffect } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";

interface AudioPlaybackGroupValue {
  register: (playerId: number, stop: () => void) => () => void;
  requestPlay: (playerId: number) => void;
  stopAll: () => void;
}

const AudioPlaybackGroupContext = createContext<AudioPlaybackGroupValue | null>(
  null,
);

export function AudioPlaybackGroupProvider({ children }: { children: ReactNode }) {
  const playersRef = useRef(new Map<number, () => void>());

  const register = useCallback((playerId: number, stop: () => void) => {
    playersRef.current.set(playerId, stop);
    return () => {
      playersRef.current.delete(playerId);
    };
  }, []);

  const requestPlay = useCallback((playerId: number) => {
    playersRef.current.forEach((stop, registeredPlayerId) => {
      if (registeredPlayerId !== playerId) stop();
    });
  }, []);

  const stopAll = useCallback(() => {
    playersRef.current.forEach((stop) => stop());
  }, []);

  useFocusEffect(
    useCallback(() => {
      return stopAll;
    }, [stopAll]),
  );

  const value = useMemo(
    () => ({ register, requestPlay, stopAll }),
    [register, requestPlay, stopAll],
  );

  return (
    <AudioPlaybackGroupContext.Provider value={value}>
      {children}
    </AudioPlaybackGroupContext.Provider>
  );
}

export function useAudioPlaybackGroup() {
  return useContext(AudioPlaybackGroupContext);
}
