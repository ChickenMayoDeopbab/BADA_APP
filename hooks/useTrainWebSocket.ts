import { refreshAuthTokens } from "@/api/tokenApi";
import { getAccessToken } from "@/utils/authTokenStorage";
import { useCallback, useEffect, useRef, useState } from "react";

const getWsBaseUrl = () =>
  (process.env.EXPO_PUBLIC_AI_API_URL ?? "")
    .replace(/\/$/, "")
    .replace(/^https/, "wss")
    .replace(/^http/, "ws");

export type WsEndReason =
  | "SCENARIO_DONE"
  | "USER_END"
  | "TIMEOUT"
  | "CRISIS"
  | "END_CALL";

/** 실시간 대화 스크립트 한 줄 (role: "user"=나 / "ai"=상대) */
export interface TranscriptTurn {
  role: string;
  text: string;
}

interface UseTrainWebSocketProps {
  sessionId: string | null;
  wsUrl: string | null; // Spring이 반환한 WS URL (토큰 미포함)
  enabled: boolean; // training 단계에서만 true
  onEmotion?: (emotion: string) => void;
  onSpeakingEnd?: () => void;
  onInterrupt?: () => void; // barge-in: 재생 버퍼 비우기
  onEnd?: (reason: WsEndReason) => void;
  onError?: (code: string) => void;
  onBinaryMessage?: (data: ArrayBuffer) => void;
  onTranscript?: (turn: TranscriptTurn) => void; // 실시간 대화 스크립트 수신
}

export interface UseTrainWebSocketReturn {
  isConnected: boolean;
  isAiSpeaking: boolean;
  displayName: string | null;
  sendEndCall: () => void;
  sendMute: (muted: boolean) => void;
  sendBinary: (data: ArrayBuffer) => void;
}

/** 훈련 WebSocket 연결 및 이벤트 처리 훅 */
export function useTrainWebSocket({
  sessionId,
  wsUrl,
  enabled,
  onEmotion,
  onSpeakingEnd,
  onInterrupt,
  onEnd,
  onError,
  onBinaryMessage,
  onTranscript,
}: UseTrainWebSocketProps): UseTrainWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const onEmotionRef = useRef(onEmotion);
  const onSpeakingEndRef = useRef(onSpeakingEnd);
  const onInterruptRef = useRef(onInterrupt);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onBinaryMessageRef = useRef(onBinaryMessage);
  const onTranscriptRef = useRef(onTranscript);
  const aiSpeakingRef = useRef(false);
  onEmotionRef.current = onEmotion;
  onSpeakingEndRef.current = onSpeakingEnd;
  onInterruptRef.current = onInterrupt;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;
  onBinaryMessageRef.current = onBinaryMessage;
  onTranscriptRef.current = onTranscript;

  const connectRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const disconnect = useCallback(() => {
    aiSpeakingRef.current = false;
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
    setDisplayName(null);
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId) return;
    const token = await getAccessToken();
    if (!token) return;

    // wsUrl은 Spring 내부 IP를 담아 반환하므로 사용하지 않고 sessionId로 직접 구성
    const url = `${getWsBaseUrl()}/ws/voice/${sessionId}?token=${token}`;
    const ws = new WebSocket(url);
    // 바이너리 프레임을 ArrayBuffer로 수신 (기본값은 플랫폼마다 다름)
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // keep-alive ping 30초마다
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data as string);
          if (
            msg?.type === "scenario_info" &&
            typeof msg?.aiRole === "string" &&
            msg.aiRole.trim()
          ) {
            setDisplayName(msg.aiRole.trim());
          }
          switch (msg.type) {
            case "emotion":
              aiSpeakingRef.current = true;
              setIsAiSpeaking(true);
              onEmotionRef.current?.(msg.value);
              break;
            case "speaking_end":
              setTimeout(() => {
                aiSpeakingRef.current = false;
                setIsAiSpeaking(false);
              }, 300);

              onSpeakingEndRef.current?.();
              break;
            case "interrupt":
              aiSpeakingRef.current = false;
              setIsAiSpeaking(false);
              onInterruptRef.current?.();
              break;
            case "transcript":
              if (typeof msg.text === "string" && msg.text.trim()) {
                onTranscriptRef.current?.({
                  role: typeof msg.role === "string" ? msg.role : "",
                  text: msg.text,
                });
              }
              break;
            case "end":
              onEndRef.current?.(msg.reason);
              break;
            case "error":
              onErrorRef.current?.(msg.code);
              break;
            case "pong":
              break;
          }
        } catch {
          // invalid JSON 무시
        }
      } else {
        // Binary: AI 음성 PCM(16kHz/mono) 데이터 수신
        if (event.data instanceof ArrayBuffer) {
          aiSpeakingRef.current = true;
          setIsAiSpeaking(true);
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
      if (event.code === 1008) {
        if (event.reason === "TOKEN_EXPIRED") {
          // 토큰 재발급 후 재연결
          (async () => {
            try {
              await refreshAuthTokens();
              await connectRef.current();
            } catch {
              onErrorRef.current?.("WS_CLOSE_TOKEN_EXPIRED");
            }
          })();
        } else {
          onErrorRef.current?.(`WS_CLOSE_${event.reason}`);
        }
      }
    };

    ws.onerror = () => {
      aiSpeakingRef.current = false;
      setIsConnected(false);
      setIsAiSpeaking(false);
    };
  }, [sessionId]);

  connectRef.current = connect;

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
      wsRef.current.send(JSON.stringify({ type: "end" }));
    }
  }, []);

  const sendMute = useCallback((muted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mute", muted }));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    // 녹음 시작 시 등록된 콜백도 최신 AI 발화 상태를 읽어야 한다.
    // React state를 캡처하면 AI가 말하기 시작한 뒤에도 마이크 데이터가 계속 전송된다.
    if (aiSpeakingRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return {
    isConnected,
    isAiSpeaking,
    displayName,
    sendEndCall,
    sendMute,
    sendBinary,
  };
}
