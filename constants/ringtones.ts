import { AudioSource } from "expo-audio";

export interface CustomRingtone {
  id: string;
  name: string;
  uri: string;
}

export interface RingtoneSettings {
  selectedId: string;
  customRingtones: CustomRingtone[];
}

export interface DefaultRingtone {
  id: string;
  name: string;
  source: AudioSource;
}

export const DEFAULT_RINGTONES: DefaultRingtone[] = [
  {
    id: "default-1",
    name: "벨소리 1",
    source: require("@/assets/bells/bell-default1.mp3"),
  },
  {
    id: "default-2",
    name: "벨소리 2",
    source: require("@/assets/bells/bell-default2.mp3"),
  },
  {
    id: "default-3",
    name: "벨소리 3",
    source: require("@/assets/bells/bell-default3.mp3"),
  },
];

export const DEFAULT_RINGTONE_SETTINGS: RingtoneSettings = {
  selectedId: DEFAULT_RINGTONES[0].id,
  customRingtones: [],
};

export function getRingtoneSource(
  settings: RingtoneSettings,
): AudioSource {
  const customRingtone = settings.customRingtones.find(
    (ringtone) => ringtone.id === settings.selectedId,
  );
  if (customRingtone) return { uri: customRingtone.uri };

  return (
    DEFAULT_RINGTONES.find(
      (ringtone) => ringtone.id === settings.selectedId,
    )?.source ?? DEFAULT_RINGTONES[0].source
  );
}
