import { CreateSessionRequest } from "@/api/types";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface PendingCallState {
  config: CreateSessionRequest | null;
  callAt: number | null; // 발신 예정 Unix 타임스탬프 (ms)
}

interface PendingCallContextValue {
  pendingCall: PendingCallState;
  /** 발신 예약 — delayMs 후 config로 세션을 생성하고 훈련 화면으로 이동 */
  schedule: (config: CreateSessionRequest, delayMs: number) => void;
  /** 발신 예약 취소 */
  cancel: () => void;
}

const PendingCallContext = createContext<PendingCallContextValue | null>(null);

export function PendingCallProvider({ children }: { children: ReactNode }) {
  const [pendingCall, setPendingCall] = useState<PendingCallState>({
    config: null,
    callAt: null,
  });

  const schedule = useCallback((config: CreateSessionRequest, delayMs: number) => {
    setPendingCall({ config, callAt: Date.now() + delayMs });
  }, []);

  const cancel = useCallback(() => {
    setPendingCall({ config: null, callAt: null });
  }, []);

  return (
    <PendingCallContext.Provider value={{ pendingCall, schedule, cancel }}>
      {children}
    </PendingCallContext.Provider>
  );
}

/** 발신 예약 컨텍스트 훅 */
export function usePendingCall() {
  const ctx = useContext(PendingCallContext);
  if (!ctx) throw new Error("usePendingCall must be used within PendingCallProvider");
  return ctx;
}
