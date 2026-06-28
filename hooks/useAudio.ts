import { Audio } from "expo-av";
import {
  cacheDirectory,
  deleteAsync,
  EncodingType,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { useCallback, useEffect, useRef } from "react";
import { NativeModules, Platform } from "react-native";

const SAMPLE_RATE = 16000;
const WAV_HEADER_SIZE = 44;
const CHANNELS = 1;
const BIT_DEPTH = 16;

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

  // Web Audio: 재생 전용 (AudioContext 스케줄링으로 즉시 스트리밍)
  const playbackCtxRef = useRef<any>(null);
  const nextPlayTimeRef = useRef(0);

  // Native: 순차 재생 큐
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const chunkQueueRef = useRef<Uint8Array[]>([]);
  const isNativePlayingRef = useRef(false);
  const chunkCounterRef = useRef(0);
  const playNextChunkRef = useRef<() => void>(() => {});

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
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    }
    return granted;
  }, []);

  const startSendingAudio = useCallback(
    async (sendFn: (data: ArrayBuffer) => void) => {
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
            sendFn(e.data);
          };
          source.connect(workletNode);
          workletNode.connect(ctx.destination);
          processorRef.current = workletNode;
          isSendingRef.current = true;
          console.log("[Audio] 마이크 스트리밍 시작 (16kHz PCM → WS)");
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
      AudioRecord.eventEmitter?.removeAllListeners?.("data");
      isSendingRef.current = true;

      console.log("[Audio][STEP1] AudioRecord.init", AUDIO_RECORD_OPTIONS);
      AudioRecord.init(AUDIO_RECORD_OPTIONS);

      let dataEventCount = 0;

      AudioRecord.on("data", (b64: string) => {
        dataEventCount++;
        console.log(
          `[Audio][STEP2] data #${dataEventCount} | len=${b64?.length ?? 0} | sending=${isSendingRef.current} | muted=${isMutedRef.current}`,
        );

        if (!isSendingRef.current) return;

        // muted(AI 응답 재생 중)일 때만 차단. 평상시(false)에는 전송되어야 함.
        if (isMutedRef.current) {
          console.log(
            "[Audio][STEP2-B] muted=true → AI 응답 재생 중, 마이크 차단",
          );
          return;
        }

        const bytes = base64ToBytes(b64);
        if (bytes.length === 0) {
          console.warn("[Audio][STEP3-WARN] PCM 길이 0");
          return;
        }

        const buf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;

        console.log(
          `[Audio][STEP4] sendFn 호출 | byteLength=${buf.byteLength}`,
        );
        sendFn(buf);
      });

      console.log("[Audio][STEP6] AudioRecord.start()");
      AudioRecord.start();
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
    } else {
      chunkQueueRef.current.push(new Uint8Array(data));
      playNextChunkRef.current();
    }
  }, []);

  const playNextChunk = useCallback(async () => {
    if (isNativePlayingRef.current || chunkQueueRef.current.length === 0)
      return;
    isNativePlayingRef.current = true;

    const pcm = chunkQueueRef.current.shift()!;
    const header = buildWavHeader(pcm.length);
    const wav = new Uint8Array(header.length + pcm.length);
    wav.set(header, 0);
    wav.set(pcm, header.length);

    const uri = `${cacheDirectory ?? ""}ai_chunk_${chunkCounterRef.current++}.wav`;
    await writeAsStringAsync(uri, bytesToBase64(wav), {
      encoding: EncodingType.Base64,
    });

    const { sound } = await Audio.Sound.createAsync({ uri });
    currentSoundRef.current = sound;

    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        isMutedRef.current = false;
        if (isSendingRef.current && RNAudioRecord) {
          if (Platform.OS === "ios" && RNAudioRecord.reassertAecMode) {
            RNAudioRecord.reassertAecMode();
          } else if (Platform.OS === "android" && RNAudioRecord.reassertAec) {
            RNAudioRecord.reassertAec();
          }
        }

        isNativePlayingRef.current = false;
        try {
          await sound.unloadAsync();
        } catch {}
        await deleteAsync(uri, { idempotent: true });
        if (currentSoundRef.current === sound) currentSoundRef.current = null;
        // 큐에 남은 chunk가 있으면 바로 다음 재생
        playNextChunkRef.current();
      }
    });

    isMutedRef.current = true;
    await sound.playAsync();

    // 재생 직후 AEC 세션 강제 복구 (하울링 방어)
    if (isSendingRef.current && RNAudioRecord) {
      if (Platform.OS === "ios" && RNAudioRecord.reassertAecMode) {
        RNAudioRecord.reassertAecMode();
      } else if (Platform.OS === "android" && RNAudioRecord.reassertAec) {
        RNAudioRecord.reassertAec();
      }
    }
  }, []);

  playNextChunkRef.current = playNextChunk;

  const resetStream = useCallback(() => {
    if (Platform.OS === "web") {
      // AudioContext를 닫지 않고 재생 타임라인만 리셋
      // 닫으면 새 컨텍스트가 유저 제스처 밖에서 생성되어 autoplay 정책에 걸림
      nextPlayTimeRef.current = 0;
    } else {
      chunkQueueRef.current = [];
      isNativePlayingRef.current = false;
      const s = currentSoundRef.current;
      currentSoundRef.current = null;
      if (s) {
        s.stopAsync()
          .catch(() => {})
          .finally(() => s.unloadAsync().catch(() => {}));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS !== "web") return;
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
