import { getRingtoneSource } from "@/constants/ringtones";
import { loadRingtoneSettings } from "@/utils/ringtoneSettings";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { AppState, Platform, Vibration } from "react-native";

/**
 * 전화 수신 중 반복할 진동 패턴(ms).
 * Android는 [대기, 진동, 대기, ...] 순서로 해석하고,
 * iOS는 진동 길이가 고정이라 값들을 진동 사이의 간격으로만 쓴다.
 */
const RINGING_PATTERN =
  Platform.OS === "android" ? [0, 800, 1000] : [0, 1800];

/**
 * 훈련 전화가 걸려오는 동안 벨소리를 반복 재생하고 기기를 진동시킨다.
 * 전화를 받거나 화면을 벗어나거나 앱이 백그라운드로 가면 즉시 멈춘다.
 */
export function useIncomingCallRinging(isRinging: boolean) {
  const player = useAudioPlayer(null);
  // 플레이어를 의존성에 넣으면 리렌더마다 effect가 다시 돌아
  // 재생과 정지가 번갈아 튀고 loop 설정도 날아간다. 참조로만 들고 있는다.
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    if (!isRinging) return;
    let active = true;

    /**
     * 화면이 사라질 때 expo-audio가 플레이어를 먼저 해제한다.
     * 해제된 뒤 호출하면 "already released" 예외가 나므로 항상 감싸서 부른다.
     */
    const safely = (run: () => void) => {
      try {
        run();
      } catch {
        // 이미 해제된 플레이어 — 소리는 어차피 멈춰 있다
      }
    };

    /** 벨소리는 항상 처음부터 다시 울린다 */
    const startRinging = () => {
      safely(() => {
        const audio = playerRef.current;
        audio.loop = true;
        audio.seekTo(0).catch(() => {});
        audio.play();
      });
      Vibration.vibrate(RINGING_PATTERN, true);
    };

    const stopRinging = () => {
      safely(() => playerRef.current.pause());
      Vibration.cancel();
    };

    void loadRingtoneSettings().then((settings) => {
      if (!active) return;

      safely(() => {
        playerRef.current.replace(getRingtoneSource(settings));
      });
      if (AppState.currentState === "active") startRinging();
    });

    // 앱이 내려가면 벨소리와 진동만 남아 계속 울리는 것을 막는다
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startRinging();
      else stopRinging();
    });

    return () => {
      active = false;
      subscription.remove();
      stopRinging();
    };
  }, [isRinging]);
}
