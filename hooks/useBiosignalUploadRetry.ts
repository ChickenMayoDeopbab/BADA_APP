import { flushBiosignalUploads } from "@/services/biosignal/uploadQueue";
import { isBiosignalSupported } from "@/utils/biosignalSettings";
import { useEffect } from "react";
import { AppState } from "react-native";

/** 앱을 시작하거나 다시 열 때 보내지 못한 생체신호 업로드를 다시 보낸다(통화 종료 후 24시간까지). */
export function useBiosignalUploadRetry() {
  useEffect(() => {
    if (!isBiosignalSupported) return;
    void flushBiosignalUploads();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flushBiosignalUploads();
    });
    return () => subscription.remove();
  }, []);
}
