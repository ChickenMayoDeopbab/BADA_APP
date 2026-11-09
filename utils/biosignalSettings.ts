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
