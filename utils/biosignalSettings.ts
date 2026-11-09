import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const BIOSIGNAL_REPORT_ENABLED_KEY = "biosignalReportEnabled";

/** Galaxy Watch는 Android 폰과만 연결되므로 생체신호 기능은 Android에서만 제공한다. */
export const isBiosignalSupported = Platform.OS === "android";

/** '몸 반응 리포트' 설정을 불러온다. 저장된 값이 없거나 읽지 못하면 꺼짐으로 본다. */
export const loadBiosignalReportEnabled = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(BIOSIGNAL_REPORT_ENABLED_KEY)) === "true";
  } catch {
    return false;
  }
};

/** '몸 반응 리포트' 설정을 기기에 저장한다. 생체신호 동의와는 별개의 값이다. */
export const saveBiosignalReportEnabled = async (
  isEnabled: boolean,
): Promise<void> => {
  await AsyncStorage.setItem(
    BIOSIGNAL_REPORT_ENABLED_KEY,
    isEnabled ? "true" : "false",
  );
};

/**
 * 서버에서 확인한 동의 상태에 맞춰 설정 값을 돌려준다.
 * 동의가 없으면 저장된 켜짐 값도 꺼짐으로 바꿔, 다른 기기에서 철회한 뒤 다시 켜진 것으로 보이지 않게 한다.
 */
export const syncBiosignalReportEnabled = async (
  isAgreed: boolean,
): Promise<boolean> => {
  const isStoredEnabled = await loadBiosignalReportEnabled();
  if (isAgreed) return isStoredEnabled;
  if (isStoredEnabled) {
    // 저장에 실패해도 화면에는 꺼짐으로 보여주고, 다음 진입 때 다시 맞춘다.
    await saveBiosignalReportEnabled(false).catch(() => undefined);
  }
  return false;
};
