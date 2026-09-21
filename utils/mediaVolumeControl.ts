import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

interface MediaVolumeControlModule {
  setEnabled: (enabled: boolean) => void;
}

const mediaVolumeControl = Platform.OS === "android"
  ? requireOptionalNativeModule<MediaVolumeControlModule>("MediaVolumeControl")
  : null;

export function setMediaVolumeControlEnabled(enabled: boolean): void {
  if (Platform.OS === "android") {
    mediaVolumeControl?.setEnabled(enabled);
  }
}
