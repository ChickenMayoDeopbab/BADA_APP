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
  | "NO_AUDIO"
  | "CRISIS"
  | "END_CALL";

/** 실시간 대화 스크립트 한 줄 (role: "user"=나 / "ai"=상대) */
export interface TranscriptTurn {
  id: number; // 수신 순서로 매기는 고유 번호 (목록 key용)
  role: string;
  text: string;
}

/** AI 턴마다 오는 다음 대답 힌트 (level 1=추천 문장, 2=조언, 3=힌트 없음) */
export interface ScriptHint {
  level: number;
  text: string;
}

interface UseTrainWebSocketProps {
  sessionId: string | null;
  wsUrl: string | null; // Spring이 반환한 WS URL (토큰 미포함)
  enabled: boolean; // training 단계에서만 true
  onEmotion?: (emotion: string) => void;
  onSpeakingEnd?: (turnId?: number) => void;
  onInterrupt?: () => void; // barge-in: 재생 버퍼 비우기
  onEnd?: (reason: WsEndReason) => void;
  onError?: (code: string) => void;
  onBinaryMessage?: (data: ArrayBuffer) => void;
  onTranscript?: (turn: TranscriptTurn) => void; // 실시간 대화 스크립트 수신
  onScriptHint?: (hint: ScriptHint) => void; // 연습 횟수별 대답 힌트 수신
}

export interface UseTrainWebSocketReturn {
  isConnected: boolean;
  isAiSpeaking: boolean;
  displayName: string | null;
  scriptLevel: number | null;
  setPlaybackBlocked: (blocked: boolean) => void;
  sendJson: (payload: object) => boolean;
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
  onScriptHint,
}: UseTrainWebSocketProps): UseTrainWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [scriptLevel, setScriptLevel] = useState<number | null>(null);

  const onEmotionRef = useRef(onEmotion);
  const onSpeakingEndRef = useRef(onSpeakingEnd);
  const onInterruptRef = useRef(onInterrupt);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onBinaryMessageRef = useRef(onBinaryMessage);
  const onTranscriptRef = useRef(onTranscript);
  const onScriptHintRef = useRef(onScriptHint);
  const aiSpeakingRef = useRef(false);
  const transcriptIdRef = useRef(0); // 다음 스크립트 줄에 붙일 번호
  onEmotionRef.current = onEmotion;
  onSpeakingEndRef.current = onSpeakingEnd;
  onInterruptRef.current = onInterrupt;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;
  onBinaryMessageRef.current = onBinaryMessage;
  onTranscriptRef.current = onTranscript;
  onScriptHintRef.current = onScriptHint;

  useEffect(() => {
    let isActive = enabled && !!sessionId;
    let hasRefreshed = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let pingInterval: ReturnType<typeof setInterval> | undefined;

    /** Detach callbacks before closing so cleanup cannot report another failure. */
    const closeSocket = () => {
      const socket = wsRef.current;
      wsRef.current = null;
      if (!socket) return;
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      try {
        socket.close();
      } catch {
        // Already closed native transports can throw during teardown.
      }
    };

    /** Invalidate pending token/refresh work and release the current transport. */
    const stop = () => {
      isActive = false;
      clearTimeout(deadline);
      clearInterval(pingInterval);
      closeSocket();
      aiSpeakingRef.current = false;
      setIsConnected(false);
      setIsAiSpeaking(false);
      setDisplayName(null);
      setScriptLevel(null);
    };

    /** Report each terminal connection failure once, with no live resources left. */
    const fail = (code: string) => {
      if (!isActive) return;
      stop();
      onErrorRef.current?.(code);
    };

    /** 서버 종료 메시지와 정상 close를 한 번만 통화 종료로 전달한다. */
    const finish = (reason: WsEndReason) => {
      if (!isActive) return;
      stop();
      onEndRef.current?.(reason);
    };

    /** Bound secure-storage lookup, refresh, and connection establishment. */
    const startDeadline = () => {
      clearTimeout(deadline);
      deadline = setTimeout(() => fail("WS_CONNECT_TIMEOUT"), 15000);
    };

    /** Only this effect's active socket may update call state or reconnect. */
    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!isActive) return;
        if (!token) {
          fail("WS_AUTH_REQUIRED");
          return;
        }
        // Spring returns an internal address; use the configured public AI endpoint.
        const ws = new WebSocket(`${getWsBaseUrl()}/ws/voice/${sessionId}`);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        let hasSessionStarted = false;
        const isCurrent = () => isActive && wsRef.current === ws;

        ws.onopen = () => {
          if (!isCurrent()) return;
          try {
            // Authentication must precede microphone PCM and all other frames.
            ws.send(JSON.stringify({ type: "auth", token }));
            ws.send(JSON.stringify({ type: "playback_capabilities", completion_ack: true }));
            clearTimeout(deadline);
            setIsConnected(true);
            pingInterval = setInterval(() => {
              if (!isCurrent() || ws.readyState !== WebSocket.OPEN) return;
              try {
                ws.send(JSON.stringify({ type: "ping" }));
              } catch {
                fail("WS_CONNECTION_ERROR");
              }
            }, 30000);
          } catch {
            fail("WS_CONNECTION_ERROR");
          }
        };

        ws.onmessage = (event) => {
          if (!isCurrent()) return;
          if (typeof event.data === "string") {
            try {
              const msg = JSON.parse(event.data);
              if (msg?.type === "scenario_info") {
                hasSessionStarted = true;
                if (typeof msg.aiRole === "string" && msg.aiRole.trim()) {
                  setDisplayName(msg.aiRole.trim());
                }
                if ([1, 2, 3].includes(msg.scriptLevel)) {
                  setScriptLevel(msg.scriptLevel);
                }
              }
              switch (msg.type) {
                case "emotion":
                  onEmotionRef.current?.(msg.value);
                  break;
                case "speaking_end":
                  // Output completion + tail guard owns the microphone gate.
                  onSpeakingEndRef.current?.(
                    typeof msg.turn_id === "number" ? msg.turn_id : undefined,
                  );
                  break;
                case "interrupt":
                  onInterruptRef.current?.();
                  break;
                case "transcript":
                  if (typeof msg.text === "string" && msg.text.trim()) {
                    onTranscriptRef.current?.({
                      id: transcriptIdRef.current++,
                      role: typeof msg.role === "string" ? msg.role : "",
                      text: msg.text,
                    });
                  }
                  break;
                case "script_hint":
                  if (typeof msg.level === "number") {
                    onScriptHintRef.current?.({
                      level: msg.level,
                      text: typeof msg.text === "string" ? msg.text.trim() : "",
                    });
                  }
                  break;
                case "end":
                  finish(msg.reason);
                  break;
                case "error":
                  fail(typeof msg.code === "string" ? msg.code : "WS_SERVER_ERROR");
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
              onBinaryMessageRef.current?.(event.data);
            }
          }
        };

        ws.onclose = (event) => {
          if (!isCurrent()) return;
          if (event.code === 1000 && hasSessionStarted) {
            finish("END_CALL");
            return;
          }
          clearInterval(pingInterval);
          closeSocket();
          aiSpeakingRef.current = false;
          setIsConnected(false);
          setIsAiSpeaking(false);
          if (event.code === 1008 && event.reason === "TOKEN_EXPIRED" && !hasRefreshed) {
            hasRefreshed = true;
            startDeadline();
            void (async () => {
              try {
                await refreshAuthTokens();
                if (isActive) await connect();
              } catch {
                fail("WS_CLOSE_TOKEN_EXPIRED");
              }
            })();
            return;
          }
          fail(`WS_CLOSE_${event.code === 1008 ? event.reason : event.code}`);
        };
        ws.onerror = () => {
          if (isCurrent()) fail("WS_CONNECTION_ERROR");
        };
      } catch {
        fail("WS_CONNECTION_ERROR");
      }
    };

    if (isActive) {
      startDeadline();
      void connect();
    } else {
      stop();
    }
    return stop;
  }, [enabled, sessionId]);

  const setPlaybackBlocked = useCallback((blocked: boolean) => {
    aiSpeakingRef.current = blocked;
    setIsAiSpeaking(blocked);
  }, []);

  const sendJson = useCallback((payload: object): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    try {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendEndCall = useCallback(() => {
    sendJson({ type: "end" });
  }, [sendJson]);

  const sendMute = useCallback((muted: boolean) => {
    sendJson({ type: "mute", muted });
  }, [sendJson]);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    // 녹음 시작 시 등록된 콜백도 최신 AI 발화 상태를 읽어야 한다.
    // React state를 캡처하면 AI가 말하기 시작한 뒤에도 마이크 데이터가 계속 전송된다.
    if (aiSpeakingRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(data);
      } catch {
        onErrorRef.current?.("WS_CONNECTION_ERROR");
      }
    }
  }, []);

  return {
    isConnected,
    isAiSpeaking,
    displayName,
    scriptLevel,
    setPlaybackBlocked,
    sendJson,
    sendEndCall,
    sendMute,
    sendBinary,
  };
}
