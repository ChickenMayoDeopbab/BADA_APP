import { TrainMicrophone } from "@/utils/trainMicrophone";
import { useTrainPlayback, type TrainPlaybackOptions } from "./useTrainPlayback";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";

const SAMPLE_RATE = 16000;
const AUDIO_RECORD_OPTIONS = {
  sampleRate: SAMPLE_RATE,
  channels: 1,
  bitsPerSample: 16,
  // Retain the tested native route and its existing optional AEC/NS effects.
  audioSource: 6,
  wavFile: "bada_rec.wav",
};
const WEB_AUDIO_CONSTRAINTS = {
  sampleRate: SAMPLE_RATE,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Decode only the bytes emitted by the native PCM recorder. */
function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// The installed JS returns an emitter subscription; its upstream declaration says void.
type NativeRecorder = Omit<typeof import("react-native-audio-record").default, "on"> & {
  on: (event: "data", callback: (data: string) => void) => { remove: () => void };
};

interface UseAudioOptions extends TrainPlaybackOptions {
  onRecordingError?: (error: unknown) => void;
}

export interface UseAudioReturn {
  requestPermission: () => Promise<boolean>;
  startSendingAudio: (sendFn: (data: ArrayBuffer) => void) => Promise<void>;
  stopSendingAudio: (shouldFlush?: boolean) => Promise<void>;
  setMicrophoneMuted: (muted: boolean) => void;
  /** AI 음성 PCM chunk를 수신 즉시 스트리밍 재생 */
  streamPcmChunk: (data: ArrayBuffer) => void;
  beginPlayback: () => void;
  flushPlayback: (turnId?: number) => void;
  /** 명시적인 interrupt/통화 종료에서만 재생을 중단한다. */
  resetStream: (reason?: string) => void;
}

/** 마이크 실시간 PCM 전송 + AI 음성 스트리밍 재생 훅 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const callbacks = useRef(options);
  callbacks.current = options;
  const microphone = useRef<TrainMicrophone | null>(null);
  if (!microphone.current) microphone.current = new TrainMicrophone();
  const { beginPlayback, streamPcmChunk, flushPlayback, resetStream, preparePlayback } = useTrainPlayback({
    ...options,
    onPlaybackBlocked: (blocked) => {
      microphone.current!.setPlaybackBlocked(blocked);
      callbacks.current.onPlaybackBlocked?.(blocked);
    },
  });

  const generation = useRef(0);
  const isSending = useRef(false);
  const operations = useRef(Promise.resolve());
  const pendingStart = useRef<Promise<void> | null>(null);
  const recorder = useRef<NativeRecorder | null>(null);
  const recordingSubscription = useRef<{ remove: () => void } | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);

  /** Close resources in the serialized capture queue; no old stop can close a new call. */
  const cleanupCapture = useCallback(async () => {
    recordingSubscription.current?.remove();
    recordingSubscription.current = null;
    const nativeRecorder = recorder.current;
    recorder.current = null;
    const node = processor.current;
    processor.current = null;
    if (node) {
      node.port.onmessage = null;
      node.port.close();
      node.disconnect();
    }
    source.current?.disconnect();
    source.current = null;
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    mediaStream.current = null;
    const ctx = audioContext.current;
    audioContext.current = null;
    if (nativeRecorder) await nativeRecorder.stop();
    if (ctx && ctx.state !== "closed") await ctx.close();
  }, []);

  /** Ask for permission within the user gesture and prepare the existing audio session. */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const attempt = generation.current;
    if (Platform.OS === "web") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: WEB_AUDIO_CONSTRAINTS });
        stream.getTracks().forEach((track) => track.stop());
        if (attempt !== generation.current) return false;
        preparePlayback();
        // Keep capture creation in the permission gesture for browser autoplay rules.
        if (!audioContext.current || audioContext.current.state === "closed") {
          const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContext.current = new Constructor({ sampleRate: SAMPLE_RATE });
        }
        await audioContext.current.resume();
        return attempt === generation.current;
      } catch {
        return false;
      }
    }
    let granted: boolean;
    if (Platform.OS === "android") {
      const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
      granted = await PermissionsAndroid.check(permission);
      if (!granted) {
        granted = (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
      }
    } else {
      ({ granted } = await requestRecordingPermissionsAsync());
    }
    if (!granted || attempt !== generation.current || AppState.currentState !== "active") return false;
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
        interruptionMode: "duckOthers",
        shouldRouteThroughEarpiece: false,
      });
      return attempt === generation.current;
    } catch {
      return false;
    }
  }, [preparePlayback]);

  /** Start once; a stop during permission/worklet loading invalidates this attempt immediately. */
  const startSendingAudio = useCallback((sendFn: (data: ArrayBuffer) => void): Promise<void> => {
    if (pendingStart.current) return pendingStart.current;
    if (isSending.current) return Promise.resolve();
    const attempt = ++generation.current;
    const task = operations.current.then(async () => {
      if (attempt !== generation.current) return;
      try {
        if (AppState.currentState !== "active") throw new Error("Microphone requires an active app");
        if (Platform.OS === "web") {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: WEB_AUDIO_CONSTRAINTS });
          mediaStream.current = stream;
          if (attempt !== generation.current) return;
          const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = audioContext.current?.state !== "closed" && audioContext.current
            ? audioContext.current
            : new Constructor({ sampleRate: SAMPLE_RATE });
          audioContext.current = ctx;
          // Wrong-rate PCM would corrupt STT and timeline durations; fail explicitly.
          if (ctx.sampleRate !== SAMPLE_RATE) throw new Error("Unsupported microphone sample rate");
          if (ctx.state === "suspended") await ctx.resume();
          if (attempt !== generation.current) return;
          await ctx.audioWorklet.addModule("/pcm-processor.js");
          if (attempt !== generation.current) return;
          source.current = ctx.createMediaStreamSource(stream);
          const node = new AudioWorkletNode(ctx, "pcm-processor");
          processor.current = node;
          node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
            if (!isSending.current || attempt !== generation.current) return;
            microphone.current!.setActive(AppState.currentState === "active");
            microphone.current!.push(event.data);
          };
          microphone.current!.setActive(AppState.currentState === "active");
          microphone.current!.start(sendFn);
          isSending.current = true;
          source.current.connect(node);
          node.connect(ctx.destination);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const nativeRecorder: NativeRecorder = require("react-native-audio-record").default;
          nativeRecorder.init(AUDIO_RECORD_OPTIONS);
          recordingSubscription.current = nativeRecorder.on("data", (b64: string) => {
            if (!isSending.current || attempt !== generation.current) return;
            microphone.current!.setActive(AppState.currentState === "active");
            microphone.current!.push(base64ToBuffer(b64));
          });
          microphone.current!.setActive(AppState.currentState === "active");
          microphone.current!.start(sendFn);
          isSending.current = true;
          nativeRecorder.start();
          recorder.current = nativeRecorder;
        }
      } catch (error) {
        isSending.current = false;
        microphone.current!.stop();
        await cleanupCapture().catch(() => {});
        if (attempt === generation.current) {
          callbacks.current.onRecordingError?.(error);
          throw error;
        }
      }
    });
    pendingStart.current = task;
    operations.current = task.catch(() => {});
    // Do not let a previous attempt clear the marker for a newer queued start.
    void task.finally(() => {
      if (pendingStart.current === task) pendingStart.current = null;
    }).catch(() => {});
    return task;
  }, [cleanupCapture]);

  /** Invalidate callbacks synchronously; flush before end only when explicitly requested. */
  const stopSendingAudio = useCallback((shouldFlush = false): Promise<void> => {
    generation.current++;
    pendingStart.current = null;
    isSending.current = false;
    let flushError: unknown;
    try {
      microphone.current!.stop(shouldFlush);
    } catch (error) {
      flushError = error;
    }
    const task = operations.current.then(async () => {
      await cleanupCapture();
      if (flushError) throw flushError;
    });
    operations.current = task.catch(() => {});
    return task;
  }, [cleanupCapture]);

  /** Apply user mute immediately, without waiting for a render or server acknowledgement. */
  const setMicrophoneMuted = useCallback((muted: boolean) => microphone.current!.setMuted(muted), []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      microphone.current!.setActive(state === "active");
    });
    return () => {
      subscription.remove();
      void stopSendingAudio().catch(() => {});
    };
  }, [stopSendingAudio]);

  return {
    requestPermission,
    startSendingAudio,
    stopSendingAudio,
    setMicrophoneMuted,
    beginPlayback,
    streamPcmChunk,
    flushPlayback,
    resetStream,
  };
}
