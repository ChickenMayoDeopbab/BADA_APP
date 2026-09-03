import {
  DEFAULT_RINGTONE_SETTINGS,
  DEFAULT_RINGTONES,
  RingtoneSettings,
} from "@/constants/ringtones";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  copyAsync,
  documentDirectory,
  makeDirectoryAsync,
} from "expo-file-system/legacy";

const RINGTONE_SETTINGS_KEY = "ringtoneSettings";
const RINGTONE_DIRECTORY = documentDirectory
  ? `${documentDirectory}ringtones/`
  : null;

function isRingtoneSettings(value: unknown): value is RingtoneSettings {
  if (!value || typeof value !== "object") return false;

  const settings = value as Partial<RingtoneSettings>;
  if (
    typeof settings.selectedId !== "string" ||
    !Array.isArray(settings.customRingtones)
  ) {
    return false;
  }

  return settings.customRingtones.every(
    (ringtone) =>
      ringtone &&
      typeof ringtone === "object" &&
      typeof ringtone.id === "string" &&
      typeof ringtone.name === "string" &&
      typeof ringtone.uri === "string",
  );
}

function normalizeSettings(settings: RingtoneSettings): RingtoneSettings {
  const selectedRingtoneExists =
    DEFAULT_RINGTONES.some(
      (ringtone) => ringtone.id === settings.selectedId,
    ) ||
    settings.customRingtones.some(
      (ringtone) => ringtone.id === settings.selectedId,
    );

  return {
    selectedId: selectedRingtoneExists
      ? settings.selectedId
      : DEFAULT_RINGTONE_SETTINGS.selectedId,
    customRingtones: settings.customRingtones,
  };
}

export async function loadRingtoneSettings(): Promise<RingtoneSettings> {
  try {
    const storedSettings = await AsyncStorage.getItem(RINGTONE_SETTINGS_KEY);
    if (!storedSettings) return DEFAULT_RINGTONE_SETTINGS;

    const parsedSettings: unknown = JSON.parse(storedSettings);
    if (!isRingtoneSettings(parsedSettings)) return DEFAULT_RINGTONE_SETTINGS;

    return normalizeSettings(parsedSettings);
  } catch {
    return DEFAULT_RINGTONE_SETTINGS;
  }
}

function getFileExtension(uri: string): string {
  const uriWithoutQuery = uri.split(/[?#]/, 1)[0];
  const extension = uriWithoutQuery.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1];
  return extension?.toLowerCase() ?? "mp3";
}

async function persistCustomRingtones(
  settings: RingtoneSettings,
): Promise<RingtoneSettings> {
  if (!RINGTONE_DIRECTORY) return settings;

  await makeDirectoryAsync(RINGTONE_DIRECTORY, { intermediates: true });

  const customRingtones = await Promise.all(
    settings.customRingtones.map(async (ringtone) => {
      if (ringtone.uri.startsWith(RINGTONE_DIRECTORY)) return ringtone;

      const destination = `${RINGTONE_DIRECTORY}${ringtone.id}.${getFileExtension(ringtone.uri)}`;
      await copyAsync({ from: ringtone.uri, to: destination });
      return { ...ringtone, uri: destination };
    }),
  );

  return { ...settings, customRingtones };
}

export async function saveRingtoneSettings(
  settings: RingtoneSettings,
): Promise<RingtoneSettings> {
  const persistedSettings = await persistCustomRingtones(settings);
  await AsyncStorage.setItem(
    RINGTONE_SETTINGS_KEY,
    JSON.stringify(persistedSettings),
  );
  return persistedSettings;
}
