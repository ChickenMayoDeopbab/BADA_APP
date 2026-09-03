import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { NativeModules, Platform } from "react-native";
import type {
  AudioBuffer as NativeAudioBuffer,
  AudioBufferQueueSourceNode,
  AudioContext as NativeAudioContext,
} from "react-native-audio-api";

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

/**
 * AI 턴마다 재생을 시작하기 전에 모아둘 오디오 길이.
 * 짧을수록 첫 소리가 빨리 나지만 청크 도착이 잠깐만 늦어도 큐가 비어 끊긴다.
 * 턴 시작 직후가 가장 트이기 쉬운 구간이라 첫 턴만이 아니라 매 턴 적용한다.
 */
const PREBUFFER_MS = 250;
/** 프리버퍼 문턱을 샘플 수로 환산한 값 */
const PREBUFFER_FRAMES = (SAMPLE_RATE * PREBUFFER_MS) / 1000;
/** 재생이 끝난 뒤 스피커 잔향이 마이크로 새어 들어가는 것을 막으려고 음소거를 더 유지하는 시간 */
const PLAYBACK_TAIL_GUARD_MS = 400;

const AUDIO_RECORD_OPTIONS = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitsPerSample: BIT_DEPTH,
  audioSource: 6, // Android: VOICE_RECOGNITION (에코 캔슬링 포함)
  wavFile: "bada_rec.wav",
};

const { RNAudioRecord } = NativeModules;

/** 네이티브 오디오 그래프 모듈 (웹 번들에 섞이지 않도록 쓰는 시점에 불러온다) */
function loadAudioApi(): typeof import("react-native-audio-api") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-audio-api");
}

/** 재생 직후 녹음 세션의 에코 캔슬러를 다시 걸어 하울링을 막는다 */
function reassertAec() {
  if (!RNAudioRecord) return;
  if (Platform.OS === "ios" && RNAudioRecord.reassertAecMode) {
    RNAudioRecord.reassertAecMode();
  } else if (Platform.OS === "android" && RNAudioRecord.reassertAec) {
    RNAudioRecord.reassertAec();
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * 수신한 raw PCM(16bit LE)을 재생용 AudioBuffer로 만든다.
 * 2바이트가 한 샘플이므로 홀수 길이로 끊긴 청크의 마지막 1바이트는
 * leftoverByteRef에 남겨 다음 청크 앞에 이어 붙인다.
 */
function createPcmBuffer(
  ctx: NativeAudioContext,
  data: ArrayBuffer,
  leftoverByteRef: { current: number | null },
): NativeAudioBuffer | null {
  const incoming = new Uint8Array(data);
  const leftoverByte = leftoverByteRef.current;

  let bytes: Uint8Array;
  if (leftoverByte === null) {
    bytes = incoming;
  } else {
    bytes = new Uint8Array(incoming.length + 1);
    bytes[0] = leftoverByte;
    bytes.set(incoming, 1);
  }

  if (bytes.length % 2 === 1) {
    leftoverByteRef.current = bytes[bytes.length - 1];
    bytes = bytes.subarray(0, bytes.length - 1);
  } else {
    leftoverByteRef.current = null;
  }

  const frameCount = bytes.length / 2;
  if (frameCount === 0) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }

  const buffer = ctx.createBuffer(CHANNELS, frameCount, SAMPLE_RATE);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

export interface UseAudioReturn {
  requestPermission: () => Promise<boolean>;
  startSendingAudio: (sendFn: (data: ArrayBuffer) => void) => Promise<void>;
  stopSendingAudio: () => Promise<void>;
  /** AI 음성 PCM chunk를 수신 즉시 스트리밍 재생 */
  streamPcmChunk: (data: ArrayBuffer) => void;
  /** 서버 송출 종료(speaking_end) 알림. 프리버퍼에 남은 소리를 마저 재생한다 */
  flushPlayback: () => void;
  /** 현재 재생 중인 오디오와 버퍼를 모두 지움 (interrupt 수신·통화 종료 시 호출) */
  resetStream: () => void;
  /** AI 음성이 스피커를 점유 중인지 (재생 구간 + 잔향 방어 구간). 화면 표시용 */
  isAiVoiceActive: boolean;
}

/** 마이크 실시간 PCM 전송 + AI 음성 스트리밍 재생 훅 */
export function useAudio(): UseAudioReturn {
  const isSendingRef = useRef(false);
  const isMutedRef = useRef(false);
  const [isAiVoiceActive, setIsAiVoiceActive] = useState(false);

  // Web Audio: 녹음 전용
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const muteReleaseTimerRef = useRef<any>(null);

  // Web Audio: 재생 전용 (AudioContext 스케줄링으로 즉시 스트리밍)
  const playbackCtxRef = useRef<any>(null);
  const nextPlayTimeRef = useRef(0);

  // Native: 통화 한 통 동안 하나만 두고 계속 이어 붙이는 재생 그래프
  const nativeCtxRef = useRef<NativeAudioContext | null>(null);
  const queueSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);
  const pendingBuffersRef = useRef<NativeAudioBuffer[]>([]); // 아직 재생을 시작하지 않은 프리버퍼
  const pendingFrameCountRef = useRef(0);
  const isQueueStartedRef = useRef(false); // 큐 소스 노드를 start()했는지 (통화당 한 번)
  const isTurnPrebufferedRef = useRef(false); // 이번 턴이 프리버퍼 문턱을 넘겼는지
  const isQueueDrainedRef = useRef(true);
  const isTurnSendingDoneRef = useRef(false); // speaking_end 수신 여부
  const leftoverByteRef = useRef<number | null>(null);

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
      /**
       * 오디오 세션의 주인을 expo-av 하나로 못박는다.
       * audio-api가 세션 카테고리를 따로 건드리면
       * react-native-audio-record 쪽 에코 캔슬러 설정과 충돌한다.
       */
      loadAudioApi().AudioManager.disableSessionManagement();
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
      AudioRecord.eventEmitter?.removeAllListeners?.("data");
      isSendingRef.current = true;

      AudioRecord.init(AUDIO_RECORD_OPTIONS);

      AudioRecord.on("data", (b64: string) => {
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

        const buf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        sendFn(buf);
      });
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
   * AI 음성이 스피커를 쓰는 동안은 마이크를 막고, 같은 구간을 화면 표시용 상태로도 내보낸다.
   * 청크마다 불리므로 값이 바뀔 때만 리렌더한다.
   */
  const setAiVoiceActive = useCallback((isActive: boolean) => {
    if (isMutedRef.current === isActive) return;
    isMutedRef.current = isActive;
    setIsAiVoiceActive(isActive);
  }, []);

  const clearMuteReleaseTimer = useCallback(() => {
    if (!muteReleaseTimerRef.current) return;
    clearTimeout(muteReleaseTimerRef.current);
    muteReleaseTimerRef.current = null;
  }, []);

  /**
   * 서버 송출이 끝났고(speaking_end) 재생 큐도 비었을 때만 마이크를 다시 연다.
   * 두 조건을 함께 걸어야 청크가 잠깐 늦게 도착해 큐가 비는 순간에 마이크가 열리지 않는다.
   */
  const releaseMicWhenTurnFinished = useCallback(() => {
    if (!isTurnSendingDoneRef.current || !isQueueDrainedRef.current) return;
    isTurnPrebufferedRef.current = false; // 다음 턴도 처음부터 다시 모아서 시작한다
    clearMuteReleaseTimer();
    muteReleaseTimerRef.current = setTimeout(() => {
      muteReleaseTimerRef.current = null;
      setAiVoiceActive(false);
      if (isSendingRef.current) reassertAec();
    }, PLAYBACK_TAIL_GUARD_MS);
  }, [clearMuteReleaseTimer, setAiVoiceActive]);

  /** 네이티브 재생 그래프를 준비한다. 컨텍스트와 큐 소스는 통화 한 통에 하나만 쓴다 */
  const ensureNativePlayback = useCallback(() => {
    const { AudioContext } = loadAudioApi();

    let ctx = nativeCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      nativeCtxRef.current = ctx;
      queueSourceRef.current = null;
      isQueueStartedRef.current = false;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    let source = queueSourceRef.current;
    if (!source) {
      source = ctx.createBufferQueueSource();
      source.connect(ctx.destination);
      source.onBufferEnded = (event) => {
        if (!event.isLastBufferInQueue) return;
        isQueueDrainedRef.current = true;
        releaseMicWhenTurnFinished();
      };
      queueSourceRef.current = source;
    }

    return { ctx, source };
  }, [releaseMicWhenTurnFinished]);

  /**
   * 모아둔 프리버퍼를 큐에 넣는다.
   * 큐 소스 노드는 통화당 한 번만 start()하고, 턴 사이에는 빈 채로 살려둔다.
   */
  const flushPrebuffer = useCallback((source: AudioBufferQueueSourceNode) => {
    pendingBuffersRef.current.forEach((buffer) => source.enqueueBuffer(buffer));
    pendingBuffersRef.current = [];
    pendingFrameCountRef.current = 0;
    isTurnPrebufferedRef.current = true;
    if (isQueueStartedRef.current) return;
    source.start();
    isQueueStartedRef.current = true;
  }, []);

  /**
   * Web: AudioContext BufferSource 스케줄링으로 끊김 없이 즉시 재생
   * Native: 하나의 큐 소스에 버퍼를 계속 이어 붙여 연속 재생
   */
  const streamPcmChunk = useCallback(
    (data: ArrayBuffer) => {
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

        setAiVoiceActive(true);
        if (muteReleaseTimerRef.current) {
          clearTimeout(muteReleaseTimerRef.current);
        }
        const remainMs = Math.max(
          0,
          (nextPlayTimeRef.current - ctx.currentTime) * 1000,
        );
        muteReleaseTimerRef.current = setTimeout(() => {
          setAiVoiceActive(false);
          muteReleaseTimerRef.current = null;
        }, remainMs + 50);
        return;
      }

      const { ctx, source } = ensureNativePlayback();

      // 청크가 들어오는 동안은 아직 이번 턴이 끝나지 않았다
      setAiVoiceActive(true);
      isTurnSendingDoneRef.current = false;
      isQueueDrainedRef.current = false;
      clearMuteReleaseTimer();

      const buffer = createPcmBuffer(ctx, data, leftoverByteRef);
      if (!buffer) return;

      if (isTurnPrebufferedRef.current) {
        source.enqueueBuffer(buffer);
        return;
      }

      pendingBuffersRef.current.push(buffer);
      pendingFrameCountRef.current += buffer.length;
      if (pendingFrameCountRef.current >= PREBUFFER_FRAMES) {
        flushPrebuffer(source);
      }
    },
    [clearMuteReleaseTimer, ensureNativePlayback, flushPrebuffer, setAiVoiceActive],
  );

  /**
   * speaking_end는 서버가 마지막 PCM을 보낸 시점이지 재생이 끝난 시점이 아니다.
   * 더 들어올 청크가 없다는 뜻이므로, 프리버퍼가 문턱을 못 넘었어도 남은 소리를 마저 재생한다.
   */
  const flushPlayback = useCallback(() => {
    if (Platform.OS === "web") return;

    isTurnSendingDoneRef.current = true;
    const source = queueSourceRef.current;
    if (source && pendingBuffersRef.current.length > 0) {
      flushPrebuffer(source);
    }
    releaseMicWhenTurnFinished();
  }, [flushPrebuffer, releaseMicWhenTurnFinished]);

  const resetStream = useCallback(() => {
    if (Platform.OS === "web") {
      nextPlayTimeRef.current = 0;
      clearMuteReleaseTimer();
      setAiVoiceActive(false);
      return;
    }

    pendingBuffersRef.current = [];
    pendingFrameCountRef.current = 0;
    leftoverByteRef.current = null;
    isTurnPrebufferedRef.current = false;
    isTurnSendingDoneRef.current = false;
    isQueueDrainedRef.current = true;
    clearMuteReleaseTimer();
    setAiVoiceActive(false);
    // 큐 소스는 살려둔다. 비운 채로 두면 다음 턴 버퍼를 그대로 이어 받는다
    queueSourceRef.current?.clearBuffers();
  }, [clearMuteReleaseTimer, setAiVoiceActive]);

  useEffect(() => {
    return () => {
      if (muteReleaseTimerRef.current) {
        clearTimeout(muteReleaseTimerRef.current);
        muteReleaseTimerRef.current = null;
      }

      if (Platform.OS !== "web") {
        queueSourceRef.current = null;
        pendingBuffersRef.current = [];
        const nativeCtx = nativeCtxRef.current;
        nativeCtxRef.current = null;
        if (nativeCtx && nativeCtx.state !== "closed") {
          nativeCtx.close().catch(() => {});
        }
        return;
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
    flushPlayback,
    resetStream,
    isAiVoiceActive,
  };
}
