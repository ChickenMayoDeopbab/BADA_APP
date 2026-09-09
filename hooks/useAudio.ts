import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import {
  cacheDirectory,
  deleteAsync,
  EncodingType,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { useCallback, useEffect, useRef } from "react";
import {
  AppState,
  AppStateStatus,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from "react-native";

const SAMPLE_RATE = 16000;
const WAV_HEADER_SIZE = 44;
const CHANNELS = 1;
const BIT_DEPTH = 16;

/**
 * 네이티브 재생은 청크 하나마다 WAV 파일을 쓰고 플레이어를 새로 만든 뒤
 * 재생이 끝나야 다음으로 넘어간다. 서버는 32ms짜리 조각을 초당 30개씩 보내는데
 * 그대로 재생하면 조각마다 파일 I/O와 디코더 준비가 끼어 빈틈이 생기고 버벅인다.
 * 이만큼 모아서 한 번에 재생해 왕복 횟수를 줄인다.
 */
// expo-audio(Media3)는 짧은 WAV마다 디코더를 다시 준비한다.
// 너무 작은 조각은 재생 시작/정지만 반복돼 실제 음성이 거의 들리지 않고
// Android에서 오디오 리소스를 과도하게 소모하므로 충분한 길이로 묶는다.
const SEGMENT_MS = 2000;
const SEGMENT_BYTES =
  (SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8) * SEGMENT_MS) / 1000;
/**
 * 이 시간 동안 새 청크가 없으면 턴이 끝난 것으로 보고 모아둔 분량을 마저 재생한다.
 * 관측된 청크 간격 최댓값이 약 114ms라 그보다 넉넉히 잡는다.
 */
const SEGMENT_IDLE_FLUSH_MS = 350;

const AUDIO_RECORD_OPTIONS = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitsPerSample: BIT_DEPTH,
  audioSource: 6, // Android: VOICE_RECOGNITION (에코 캔슬링 포함)
  wavFile: "bada_rec.wav",
};

const { RNAudioRecord } = NativeModules;

/** PCM 데이터에 붙일 44바이트 WAV 헤더 생성 */
function buildWavHeader(pcmByteLength: number): Uint8Array {
  const header = new Uint8Array(WAV_HEADER_SIZE);
  const v = new DataView(header.buffer);
  const byteRate = SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8);
  const blockAlign = CHANNELS * (BIT_DEPTH / 8);

  v.setUint32(0, 0x52494646, false);
  v.setUint32(4, 36 + pcmByteLength, true);
  v.setUint32(8, 0x57415645, false);
  v.setUint32(12, 0x666d7420, false);
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, CHANNELS, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, BIT_DEPTH, true);
  v.setUint32(36, 0x64617461, false);
  v.setUint32(40, pcmByteLength, true);

  return header;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export interface UseAudioReturn {
  requestPermission: () => Promise<boolean>;
  startSendingAudio: (sendFn: (data: ArrayBuffer) => void) => Promise<void>;
  stopSendingAudio: () => Promise<void>;
  /** AI 음성 PCM chunk를 수신 즉시 스트리밍 재생 */
  streamPcmChunk: (data: ArrayBuffer) => void;
  /** 현재 재생 중인 오디오와 버퍼를 모두 지움 (emotion/interrupt 수신 시 호출) */
  resetStream: () => void;
}

/** 마이크 실시간 PCM 전송 + AI 음성 스트리밍 재생 훅 */
export function useAudio(): UseAudioReturn {
  const isSendingRef = useRef(false);
  const isMutedRef = useRef(false);

  // Web Audio: 녹음 전용
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const muteReleaseTimerRef = useRef<any>(null);

  // Web Audio: 재생 전용 (AudioContext 스케줄링으로 즉시 스트리밍)
  const playbackCtxRef = useRef<any>(null);
  const nextPlayTimeRef = useRef(0);

  // Native: 순차 재생 큐
  const currentPlayerRef = useRef<AudioPlayer | null>(null);
  const currentPlayerSubscriptionRef = useRef<{ remove: () => void } | null>(
    null,
  );
  const currentPlaybackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const currentPlayerUriRef = useRef<string | null>(null);
  const chunkQueueRef = useRef<Uint8Array[]>([]);
  const isNativePlayingRef = useRef(false);
  const chunkCounterRef = useRef(0);
  const playNextChunkRef = useRef<() => void>(() => {});
  // Native: 재생 단위(SEGMENT_MS)를 채울 때까지 모아두는 조각들
  const pendingPcmRef = useRef<Uint8Array[]>([]);
  const pendingBytesRef = useRef(0);
  const idleFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushSegmentRef = useRef<() => void>(() => {});
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      try {
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: true,
        });
        (stream as any).getTracks().forEach((t: any) => t.stop());
        // 유저 제스처 컨텍스트에서 재생용/녹음용 AudioContext 미리 생성 (브라우저 autoplay 정책 대응)
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (
          !playbackCtxRef.current ||
          playbackCtxRef.current.state === "closed"
        ) {
          playbackCtxRef.current = new AudioContextClass({
            sampleRate: SAMPLE_RATE,
          });
          nextPlayTimeRef.current = 0;
        }
        if (
          !audioContextRef.current ||
          audioContextRef.current.state === "closed"
        ) {
          audioContextRef.current = new AudioContextClass({
            sampleRate: SAMPLE_RATE,
          });
        }
        return true;
      } catch {
        return false;
      }
    }
    console.info("[Audio] 마이크 권한 확인 시작");
    let granted: boolean;
    if (Platform.OS === "android") {
      const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
      granted = await PermissionsAndroid.check(permission);
      if (!granted) {
        granted =
          (await PermissionsAndroid.request(permission)) ===
          PermissionsAndroid.RESULTS.GRANTED;
      }
    } else {
      ({ granted } = await requestRecordingPermissionsAsync());
    }
    console.info("[Audio] 마이크 권한 확인 완료", { granted });
    if (!granted || AppState.currentState !== "active") return false;

    try {
      console.info("[Audio] 오디오 모드 설정 시작");
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
        interruptionMode: "duckOthers",
        shouldRouteThroughEarpiece: false,
      });
      console.info("[Audio] 오디오 모드 설정 완료");
    } catch (error) {
      console.warn("[Audio] 오디오 모드 설정 실패:", error);
      return false;
    }
    return true;
  }, []);

  const startSendingAudio = useCallback(
    async (sendFn: (data: ArrayBuffer) => void) => {
      if (isSendingRef.current) return;

      if (Platform.OS === "web") {
        try {
          const stream = await (navigator.mediaDevices as any).getUserMedia({
            audio: {
              sampleRate: SAMPLE_RATE,
              channelCount: CHANNELS,
              echoCancellation: true,
            },
          });
          mediaStreamRef.current = stream;

          // requestPermission에서 미리 생성된 컨텍스트 재사용, 없으면 새로 생성
          const AudioContextClass =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          let ctx = audioContextRef.current;
          if (!ctx || ctx.state === "closed") {
            ctx = new AudioContextClass({ sampleRate: SAMPLE_RATE });
            audioContextRef.current = ctx;
          }
          if (ctx.state === "suspended") {
            await ctx.resume();
          }

          const source = ctx.createMediaStreamSource(stream);
          // AudioWorkletNode: Float32 샘플 → Int16 PCM 변환 후 WebSocket 전송
          await ctx.audioWorklet.addModule("/pcm-processor.js");
          const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
          workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
            if (!isSendingRef.current) return;
            if (isMutedRef.current) return;
            sendFn(e.data);
          };
          source.connect(workletNode);
          workletNode.connect(ctx.destination);
          processorRef.current = workletNode;
          isSendingRef.current = true;
        } catch (e) {
          console.warn("[Audio] 마이크 스트리밍 시작 실패:", e);
          isSendingRef.current = false;
          if (processorRef.current) {
            try {
              processorRef.current.disconnect();
            } catch {}
            processorRef.current = null;
          }
          if (mediaStreamRef.current) {
            try {
              mediaStreamRef.current.getTracks().forEach((t: any) => t.stop());
            } catch {}
            mediaStreamRef.current = null;
          }
        }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AudioRecord = require("react-native-audio-record").default;
      console.info("[Audio] 네이티브 마이크 스트리밍 시작 요청", {
        hasNativeModule: Boolean(RNAudioRecord),
      });

      AudioRecord.init(AUDIO_RECORD_OPTIONS);

      let dataEventCount = 0;

      AudioRecord.on("data", (b64: string) => {
        dataEventCount++;

        if (!isSendingRef.current) return;

        // muted(AI 응답 재생 중)일 때만 차단. 평상시(false)에는 전송되어야 함.
        if (isMutedRef.current) {
          return;
        }

        const bytes = base64ToBytes(b64);
        if (bytes.length === 0) {
          console.warn("[Audio][STEP3-WARN] PCM 길이 0");
          return;
        }

        if (dataEventCount === 1) {
          console.info("[Audio] 첫 PCM 프레임 수신", {
            byteLength: bytes.length,
          });
        }

        const buf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        sendFn(buf);
      });
      try {
        AudioRecord.start();
        isSendingRef.current = true;
        console.info("[Audio] 네이티브 마이크 스트리밍 시작 완료");
      } catch (error) {
        isSendingRef.current = false;
        console.warn("[Audio] 네이티브 마이크 스트리밍 시작 실패", error);
        throw error;
      }
    },
    [],
  );

  const stopSendingAudio = useCallback(async () => {
    if (Platform.OS === "web") {
      isSendingRef.current = false;
      if (processorRef.current) {
        processorRef.current.port?.close();
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t: any) => t.stop());
        mediaStreamRef.current = null;
      }
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx && ctx.state !== "closed") {
        try {
          await ctx.close();
        } catch {}
      }
      return;
    }
    if (!isSendingRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AudioRecord = require("react-native-audio-record").default;
    isSendingRef.current = false;
    await AudioRecord.stop();
  }, []);

  /**
   * Web: AudioContext BufferSource 스케줄링으로 끊김 없이 즉시 재생
   * Native: WAV 파일 큐에 추가 후 순차 재생
   */
  const streamPcmChunk = useCallback((data: ArrayBuffer) => {
    if (Platform.OS === "web") {
      let ctx = playbackCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass({ sampleRate: SAMPLE_RATE });
        playbackCtxRef.current = ctx;
        nextPlayTimeRef.current = 0;
      }
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const int16 = new Int16Array(data);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
      source.start(startAt);
      nextPlayTimeRef.current = startAt + audioBuffer.duration;

      isMutedRef.current = true;
      if (muteReleaseTimerRef.current) {
        clearTimeout(muteReleaseTimerRef.current);
      }
      const remainMs = Math.max(
        0,
        (nextPlayTimeRef.current - ctx.currentTime) * 1000,
      );
      muteReleaseTimerRef.current = setTimeout(() => {
        isMutedRef.current = false;
        muteReleaseTimerRef.current = null;
      }, remainMs + 50);
      return;
    }

    // 백그라운드에서는 Android가 오디오 포커스를 내주지 않는다.
    // 수신 청크를 재생 큐에 넣지 않아 포커스 예외와 복귀 후 오래된 응답 재생을 함께 막는다.
    if (appStateRef.current !== "active") return;

    pendingPcmRef.current.push(new Uint8Array(data));
    pendingBytesRef.current += data.byteLength;

    if (idleFlushTimerRef.current) clearTimeout(idleFlushTimerRef.current);
    idleFlushTimerRef.current = setTimeout(() => {
      idleFlushTimerRef.current = null;
      flushSegmentRef.current();
    }, SEGMENT_IDLE_FLUSH_MS);

    if (pendingBytesRef.current >= SEGMENT_BYTES) {
      flushSegmentRef.current();
    }
  }, []);

  /** 모아둔 조각들을 하나로 이어 붙여 재생 큐에 넣는다 */
  const flushSegment = useCallback(() => {
    const parts = pendingPcmRef.current;
    const totalBytes = pendingBytesRef.current;
    if (totalBytes === 0) return;

    pendingPcmRef.current = [];
    pendingBytesRef.current = 0;

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const part of parts) {
      merged.set(part, offset);
      offset += part.length;
    }

    chunkQueueRef.current.push(merged);
    playNextChunkRef.current();
  }, []);

  flushSegmentRef.current = flushSegment;

  const playNextChunk = useCallback(async () => {
    if (isNativePlayingRef.current || chunkQueueRef.current.length === 0)
      return;
    if (appStateRef.current !== "active") {
      chunkQueueRef.current = [];
      return;
    }
    isNativePlayingRef.current = true;

    const pcm = chunkQueueRef.current.shift()!;
    const header = buildWavHeader(pcm.length);
    const wav = new Uint8Array(header.length + pcm.length);
    wav.set(header, 0);
    wav.set(pcm, header.length);

    const uri = `${cacheDirectory ?? ""}ai_chunk_${chunkCounterRef.current++}.wav`;
    let player: AudioPlayer | null = null;
    let subscription: { remove: () => void } | null = null;
    let playbackTimeout: ReturnType<typeof setTimeout> | null = null;
    let cleanedUp = false;

    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      isMutedRef.current = false;
      isNativePlayingRef.current = false;

      const finishedSubscription = subscription;
      const finishedTimeout = playbackTimeout;
      if (finishedTimeout) clearTimeout(finishedTimeout);
      playbackTimeout = null;
      finishedSubscription?.remove();
      subscription = null;

      if (player) {
        try {
          player.pause();
          player.remove();
        } catch {}
      }
      await deleteAsync(uri, { idempotent: true }).catch(() => {});
      if (currentPlayerRef.current === player) currentPlayerRef.current = null;
      if (currentPlayerSubscriptionRef.current === finishedSubscription) {
        currentPlayerSubscriptionRef.current = null;
      }
      if (currentPlaybackTimeoutRef.current === finishedTimeout) {
        currentPlaybackTimeoutRef.current = null;
      }
      if (currentPlayerUriRef.current === uri) currentPlayerUriRef.current = null;

      if (appStateRef.current === "active") playNextChunkRef.current();
    };

    try {
      await writeAsStringAsync(uri, bytesToBase64(wav), {
        encoding: EncodingType.Base64,
      });
      if (appStateRef.current !== "active") {
        await cleanup();
        return;
      }

      player = createAudioPlayer(
        { uri },
        { updateInterval: 50, keepAudioSessionActive: true },
      );
      currentPlayerRef.current = player;
      currentPlayerUriRef.current = uri;

      subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded && status.didJustFinish) void cleanup();
      });
      currentPlayerSubscriptionRef.current = subscription;

      if (appStateRef.current !== "active") {
        await cleanup();
        return;
      }

      isMutedRef.current = true;
      player.volume = 1;
      player.play();

      // 네이티브 종료 이벤트가 유실돼도 다음 큐가 영구히 막히지 않도록 안전 타이머를 둔다.
      const playbackMs = (pcm.length / (SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8))) * 1000;
      console.info("[Audio] AI 음성 재생 시작", {
        playbackMs: Math.round(playbackMs),
        queuedSegments: chunkQueueRef.current.length,
      });
      playbackTimeout = setTimeout(() => void cleanup(), playbackMs + 5000);
      currentPlaybackTimeoutRef.current = playbackTimeout;

      // 재생 직후 AEC 세션 강제 복구 (하울링 방어)
      if (isSendingRef.current && RNAudioRecord) {
        if (Platform.OS === "ios" && RNAudioRecord.reassertAecMode) {
          RNAudioRecord.reassertAecMode();
        } else if (Platform.OS === "android" && RNAudioRecord.reassertAec) {
          RNAudioRecord.reassertAec();
        }
      }
    } catch (error) {
      // 앱 상태가 바뀌는 순간 Android 오디오 포커스를 얻지 못해도 RedBox로 번지지 않는다.
      console.warn("[Audio] AI 음성 재생 실패:", error);
      await cleanup();
    }
  }, []);

  playNextChunkRef.current = playNextChunk;

  const resetStream = useCallback(() => {
    if (Platform.OS === "web") {
      nextPlayTimeRef.current = 0;
      if (muteReleaseTimerRef.current) {
        clearTimeout(muteReleaseTimerRef.current);
        muteReleaseTimerRef.current = null;
      }
      isMutedRef.current = false;
    } else {
      if (idleFlushTimerRef.current) {
        clearTimeout(idleFlushTimerRef.current);
        idleFlushTimerRef.current = null;
      }
      pendingPcmRef.current = [];
      pendingBytesRef.current = 0;
      chunkQueueRef.current = [];
      isNativePlayingRef.current = false;
      isMutedRef.current = false;
      const player = currentPlayerRef.current;
      const subscription = currentPlayerSubscriptionRef.current;
      const playbackTimeout = currentPlaybackTimeoutRef.current;
      const uri = currentPlayerUriRef.current;
      currentPlayerRef.current = null;
      currentPlayerSubscriptionRef.current = null;
      currentPlaybackTimeoutRef.current = null;
      currentPlayerUriRef.current = null;
      if (playbackTimeout) clearTimeout(playbackTimeout);
      subscription?.remove();
      if (player) {
        try {
          player.pause();
          player.remove();
        } catch {}
      }
      if (uri) void deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState !== "active") resetStream();
    });

    return () => subscription.remove();
  }, [resetStream]);

  useEffect(() => {
    return () => {
      if (Platform.OS !== "web") return;
      if (muteReleaseTimerRef.current) {
        clearTimeout(muteReleaseTimerRef.current);
        muteReleaseTimerRef.current = null;
      }
      const rec = audioContextRef.current;
      audioContextRef.current = null;
      if (rec && rec.state !== "closed") {
        rec.close().catch(() => {});
      }
      const play = playbackCtxRef.current;
      playbackCtxRef.current = null;
      if (play && play.state !== "closed") {
        play.close().catch(() => {});
      }
    };
  }, []);

  return {
    requestPermission,
    startSendingAudio,
    stopSendingAudio,
    streamPcmChunk,
    resetStream,
  };
}
