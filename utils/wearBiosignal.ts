import {
  NativeModule,
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";
import { Platform } from "react-native";

export type WatchMeasurementState = "idle" | "measuring" | "sending" | "sent" | "error";

export interface WatchConnection {
  isConnected: boolean;
  nodeId: string | null;
  displayName: string | null;
}

/** 워치가 5초마다, 그리고 상태가 바뀔 때 보낸다. 심박 값은 들어 있지 않다. */
export interface WatchStatusEvent {
  id: string | null;
  state: WatchMeasurementState;
  /** 워치 송신 시각(워치 시계 epoch ms) */
  watchMs: number;
  trackers: string[];
  error: string | null;
  /** 폰 수신 시각(폰 시계 epoch ms) */
  phoneReceivedMs: number;
}

/** 세션 파일을 다 받았을 때. uri는 문서 폴더의 biosignal/{id}.watch.json */
export interface WatchDataEvent {
  id: string;
  uri: string;
  phoneReceivedMs: number;
}

export interface WatchErrorEvent {
  id: string | null;
  code: string;
  message: string;
}

type WearBiosignalEvents = {
  onWatchStatus: (event: WatchStatusEvent) => void;
  onData: (event: WatchDataEvent) => void;
  onError: (event: WatchErrorEvent) => void;
};

declare class WearBiosignalModule extends NativeModule<WearBiosignalEvents> {
  getWatchStatus(): Promise<WatchConnection>;
  start(id: string, phoneMs: number): Promise<void>;
  stop(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  ack(id: string): Promise<void>;
}

const wearBiosignal = Platform.OS === "android"
  ? requireOptionalNativeModule<WearBiosignalModule>("WearBiosignal")
  : null;

const DISCONNECTED: WatchConnection = { isConnected: false, nodeId: null, displayName: null };

/** 측정 앱이 깔린 워치가 지금 닿는지. iOS·모듈 없음은 연결 안 됨. */
export async function getWatchConnection(): Promise<WatchConnection> {
  if (!wearBiosignal) return DISCONNECTED;
  try {
    return await wearBiosignal.getWatchStatus();
  } catch {
    return DISCONNECTED;
  }
}

/** 명령을 워치로 보냈으면 true. 워치가 없거나 보내지 못하면 false. */
async function sendCommand(send: (module: WearBiosignalModule) => Promise<void>): Promise<boolean> {
  if (!wearBiosignal) return false;
  try {
    await send(wearBiosignal);
    return true;
  } catch {
    return false;
  }
}

export const startWatchMeasurement = (id: string, phoneMs: number = Date.now()) =>
  sendCommand((module) => module.start(id, phoneMs));

/** 측정을 끝내고 세션 파일을 받는다. 파일을 못 받았으면 다시 보내 재전송을 요청할 수 있다. */
export const stopWatchMeasurement = (id: string) => sendCommand((module) => module.stop(id));

/** 측정을 버린다(거절·통화 미시작·동의 철회). 워치 파일도 지워진다. */
export const cancelWatchMeasurement = (id: string) => sendCommand((module) => module.cancel(id));

/** 세션 파일을 받아 처리했음을 알린다. 워치가 파일을 지운다. */
export const ackWatchMeasurement = (id: string) => sendCommand((module) => module.ack(id));

export const addWatchStatusListener = (listener: (event: WatchStatusEvent) => void): EventSubscription | null =>
  wearBiosignal?.addListener("onWatchStatus", listener) ?? null;

export const addWatchDataListener = (listener: (event: WatchDataEvent) => void): EventSubscription | null =>
  wearBiosignal?.addListener("onData", listener) ?? null;

export const addWatchErrorListener = (listener: (event: WatchErrorEvent) => void): EventSubscription | null =>
  wearBiosignal?.addListener("onError", listener) ?? null;
