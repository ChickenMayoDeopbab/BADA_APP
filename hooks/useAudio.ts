import { writeAsStringAsync, deleteAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

const SAMPLE_RATE = 16000;
const WAV_HEADER_SIZE = 44;
const CHANNELS = 1;
const BIT_DEPTH = 16;

const AUDIO_RECORD_OPTIONS = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitsPerSample: BIT_DEPTH,
  audioSource: 6, // Android: VOICE_RECOGNITION (에코 캔슬링 포함)
  wavFile: 'bada_rec.wav',
};

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
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export interface UseAudioReturn {
  requestPermission: () => Promise<boolean>;
  startSendingAudio: (sendFn: (data: ArrayBuffer) => void) => Promise<void>;
  stopSendingAudio: () => Promise<void>;
  receivePcmChunk: (data: ArrayBuffer) => void;
  clearAudioBuffer: () => void;
  playReceivedAudio: () => Promise<void>;
}

/** 마이크 실시간 PCM 전송 + AI 음성 수신 재생 훅 */
export function useAudio(): UseAudioReturn {
  const isSendingRef = useRef(false);
  const pcmBufferRef = useRef<Uint8Array[]>([]);
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  // Web Audio API 전용 ref (any 타입: RN tsconfig에 DOM lib 미포함)
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      try {
        const stream = await (navigator.mediaDevices as any).getUserMedia({ audio: true });
        (stream as any).getTracks().forEach((t: any) => t.stop());
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

  const startSendingAudio = useCallback(async (sendFn: (data: ArrayBuffer) => void) => {
    if (Platform.OS === 'web') {
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: CHANNELS, echoCancellation: true },
      });
      mediaStreamRef.current = stream;

      // Safari: webkitAudioContext 폴백
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode: Float32 샘플 → Int16 PCM 변환 후 WebSocket 전송
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e: any) => {
        if (!isSendingRef.current) return;
        const float32: Float32Array = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)));
        }
        sendFn(int16.buffer.slice(0) as ArrayBuffer);
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;
      isSendingRef.current = true;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AudioRecord = require('react-native-audio-record').default;
    isSendingRef.current = true;
    AudioRecord.init(AUDIO_RECORD_OPTIONS);
    AudioRecord.on('data', (b64: string) => {
      if (!isSendingRef.current) return;
      const bytes = base64ToBytes(b64);
      if (bytes.length === 0) return;
      const buf = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
      sendFn(buf);
    });
    AudioRecord.start();
  }, []);

  const stopSendingAudio = useCallback(async () => {
    if (Platform.OS === 'web') {
      isSendingRef.current = false;
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t: any) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }
    if (!isSendingRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AudioRecord = require('react-native-audio-record').default;
    isSendingRef.current = false;
    await AudioRecord.stop();
  }, []);

  const receivePcmChunk = useCallback((data: ArrayBuffer) => {
    pcmBufferRef.current.push(new Uint8Array(data));
  }, []);

  const clearAudioBuffer = useCallback(() => {
    pcmBufferRef.current = [];
  }, []);

  const playReceivedAudio = useCallback(async () => {
    const chunks = [...pcmBufferRef.current];
    pcmBufferRef.current = [];
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const pcm = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }

    const header = buildWavHeader(pcm.length);
    const wav = new Uint8Array(header.length + pcm.length);
    wav.set(header, 0);
    wav.set(pcm, header.length);

    if (Platform.OS === 'web') {
      // Blob URL로 HTMLAudioElement 재생
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      if (webAudioRef.current) {
        (webAudioRef.current as HTMLAudioElement).pause();
        webAudioRef.current = null;
      }
      const audio = new (window as any).Audio(url) as HTMLAudioElement;
      webAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (webAudioRef.current === audio) webAudioRef.current = null;
      };
      await audio.play();
      return;
    }

    const tempUri = `${cacheDirectory ?? ''}ai_audio_${Date.now()}.wav`;
    await writeAsStringAsync(tempUri, bytesToBase64(wav), {
      encoding: EncodingType.Base64,
    });

    if (currentSoundRef.current) {
      try { await currentSoundRef.current.unloadAsync(); } catch {}
      currentSoundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
    currentSoundRef.current = sound;
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        try { await sound.unloadAsync(); } catch {}
        await deleteAsync(tempUri, { idempotent: true });
        if (currentSoundRef.current === sound) currentSoundRef.current = null;
      }
    });
    await sound.playAsync();
  }, []);

  return {
    requestPermission,
    startSendingAudio,
    stopSendingAudio,
    receivePcmChunk,
    clearAudioBuffer,
    playReceivedAudio,
  };
}
