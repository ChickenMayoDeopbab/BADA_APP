import { useTrainPlayback, type TrainPlaybackOptions } from "./useTrainPlayback";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import {
  AppState,
  PermissionsAndroid,
  Platform,
} from "react-native";

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

const AUDIO_RECORD_OPTIONS = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitsPerSample: BIT_DEPTH,
  audioSource: 6, // Android: VOICE_RECOGNITION; AEC availability is device-dependent
  wavFile: "bada_rec.wav",
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export interface UseAudioReturn {
  requestPermission: () => Promise<boolean>;
  startSendingAudio: (sendFn: (data: ArrayBuffer) => void) => Promise<void>;
  stopSendingAudio: () => Promise<void>;
  /** AI 음성 PCM chunk를 수신 즉시 스트리밍 재생 */
  streamPcmChunk: (data: ArrayBuffer) => void;
  beginPlayback: () => void;
  flushPlayback: () => void;
  /** 명시적인 interrupt/통화 종료에서만 재생을 중단한다. */
  resetStream: (reason?: string) => void;
}

/** 마이크 실시간 PCM 전송 + AI 음성 스트리밍 재생 훅 */
export function useAudio(options: TrainPlaybackOptions = {}): UseAudioReturn {
  const isSendingRef = useRef(false);
  const { muted: isMutedRef, beginPlayback, streamPcmChunk, flushPlayback, resetStream, preparePlayback } = useTrainPlayback(options);
  const recordingSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  // Web Audio: 녹음 전용
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
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
        preparePlayback();
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
    if (!granted || AppState.currentState !== "active") return false;

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
        interruptionMode: "duckOthers",
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      return false;
    }
    return true;
  }, [preparePlayback]);

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
            if (!isSendingRef.current || AppState.currentState !== "active") return;
            if (isMutedRef.current) return;
            sendFn(e.data);
          };
          source.connect(workletNode);
          workletNode.connect(ctx.destination);
          processorRef.current = workletNode;
          isSendingRef.current = true;
        } catch {
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

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AudioRecord = require("react-native-audio-record").default;

      AudioRecord.init(AUDIO_RECORD_OPTIONS);

      recordingSubscriptionRef.current?.remove();
      recordingSubscriptionRef.current = AudioRecord.on("data", (b64: string) => {
        if (!isSendingRef.current || AppState.currentState !== "active") return;

        // muted(AI 응답 재생 중)일 때만 차단. 평상시(false)에는 전송되어야 함.
        if (isMutedRef.current) {
          return;
        }

        const bytes = base64ToBytes(b64);
        if (bytes.length === 0) {
          return;
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
      } catch (error) {
        isSendingRef.current = false;
        throw error;
      }
    },
    [isMutedRef],
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AudioRecord = require("react-native-audio-record").default;
    isSendingRef.current = false;
    recordingSubscriptionRef.current?.remove();
    recordingSubscriptionRef.current = null;
    await AudioRecord.stop();
  }, []);

  useEffect(() => () => {
    void stopSendingAudio().catch(() => {});
  }, [stopSendingAudio]);

  return {
    requestPermission,
    startSendingAudio,
    stopSendingAudio,
    beginPlayback,
    streamPcmChunk,
    flushPlayback,
    resetStream,
  };
}
