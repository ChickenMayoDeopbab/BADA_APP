import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const getWsBaseUrl = () =>
  (process.env.EXPO_PUBLIC_AI_API_URL ?? '')
    .replace(/\/$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http/, 'ws');

export type WsEndReason = 'SCENARIO_DONE' | 'USER_END' | 'TIMEOUT' | 'CRISIS' | 'END_CALL';

interface UseTrainWebSocketProps {
  sessionId: string | null;
  enabled: boolean; // training 단계에서만 true
  onEmotion?: (emotion: string) => void;
  onSpeakingEnd?: () => void;
  onEnd?: (reason: WsEndReason) => void;
  onError?: (code: string) => void;
  onBinaryMessage?: (data: ArrayBuffer) => void;
}

export interface UseTrainWebSocketReturn {
  isConnected: boolean;
  isAiSpeaking: boolean;
  sendEndCall: () => void;
  sendMute: (muted: boolean) => void;
  sendBinary: (data: ArrayBuffer) => void;
}

/** 훈련 WebSocket 연결 및 이벤트 처리 훅 */
export function useTrainWebSocket({
  sessionId,
  enabled,
  onEmotion,
  onSpeakingEnd,
  onEnd,
  onError,
  onBinaryMessage,
}: UseTrainWebSocketProps): UseTrainWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const onEmotionRef = useRef(onEmotion);
  const onSpeakingEndRef = useRef(onSpeakingEnd);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onBinaryMessageRef = useRef(onBinaryMessage);
  onEmotionRef.current = onEmotion;
  onSpeakingEndRef.current = onSpeakingEnd;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;
  onBinaryMessageRef.current = onBinaryMessage;

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAiSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId) return;
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    const url = `${getWsBaseUrl()}/ws/voice/${sessionId}?token=${token}`;
    const ws = new WebSocket(url);
    // 바이너리 프레임을 ArrayBuffer로 수신 (기본값은 플랫폼마다 다름)
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // keep-alive ping 30초마다
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.type) {
            case 'emotion':
              setIsAiSpeaking(true);
              onEmotionRef.current?.(msg.value);
              break;
            case 'speaking_end':
              setIsAiSpeaking(false);
              onSpeakingEndRef.current?.();
              break;
            case 'interrupt':
              // barge-in 현재 비활성 — 핸들러만 유지
              setIsAiSpeaking(false);
              break;
            case 'end':
              onEndRef.current?.(msg.reason);
              break;
            case 'error':
              onErrorRef.current?.(msg.code);
              break;
            case 'pong':
              break;
          }
        } catch {
          // invalid JSON 무시
        }
      } else {
        // Binary: AI 음성 PCM(16kHz/mono) 데이터 수신
        if (event.data instanceof ArrayBuffer) {
          onBinaryMessageRef.current?.(event.data);
        }
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setIsAiSpeaking(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // close code 1008: 인증 오류 (TOKEN_EXPIRED 등)
      if (event.code === 1008) {
        onErrorRef.current?.(`WS_CLOSE_${event.reason}`);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    connect();
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  const sendEndCall = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
  }, []);

  const sendMute = useCallback((muted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'mute', muted }));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { isConnected, isAiSpeaking, sendEndCall, sendMute, sendBinary };
}
