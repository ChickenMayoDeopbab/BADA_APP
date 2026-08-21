import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import {
  RadioIndicator,
  SettingCard,
  SettingRow,
  SettingSectionLabel,
} from "@/components/profile/SettingControls";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

interface CustomRingtone {
  id: string;
  name: string;
  uri?: string;
}

interface RingtoneSettings {
  selectedId: string;
  customRingtones: CustomRingtone[];
}

const DUMMY_RINGTONE_SETTINGS: RingtoneSettings = {
  selectedId: "default-1",
  customRingtones: [
    { id: "custom-1", name: "내 손을 잡아" },
    { id: "custom-2", name: "뭐하지" },
    { id: "custom-3", name: "좋은 하루" },
  ],
};

const DEFAULT_RINGTONES = [
  { id: "default-1", name: "벨소리 1" },
  { id: "default-2", name: "벨소리 2" },
  { id: "default-3", name: "벨소리 3" },
];

export default function RingtoneSettingsScreen() {
  const [initialSettings, setInitialSettings] = useState<RingtoneSettings>(
    DUMMY_RINGTONE_SETTINGS,
  );
  const [settings, setSettings] = useState<RingtoneSettings>(
    DUMMY_RINGTONE_SETTINGS,
  );

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const addAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || (asset.mimeType && !asset.mimeType.startsWith("audio/"))) {
        Alert.alert("음성 파일만 선택할 수 있어요");
        return;
      }

      const id = `audio:${asset.uri}`;
      const name = asset.name.replace(/\.[^/.]+$/, "") || asset.name;

      setSettings((current) => ({
        selectedId: id,
        customRingtones: current.customRingtones.some((item) => item.id === id)
          ? current.customRingtones
          : [...current.customRingtones, { id, name, uri: asset.uri }],
      }));
    } catch {
      Alert.alert("파일을 열지 못했어요", "잠시 후 다시 시도해 주세요.");
    }
  };

  const save = () => {
    setInitialSettings(settings);
    router.back();
  };

  return (
    <ProfileSettingsScreen
      title="벨소리 설정"
      hasChanges={hasChanges}
      onSave={save}
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="음성 파일 추가"
          onPress={() => void addAudioFile()}
          hitSlop={8}
          className="size-16 items-center justify-center active:opacity-70"
        >
          <Ionicons
            name="add"
            size={34}
            color={SEMANTIC_COLORS.label.alternative}
          />
        </Pressable>
      }
    >
      <View className="gap-1.5">
        <SettingSectionLabel>내 벨소리</SettingSectionLabel>
        <SettingCard>
          {settings.customRingtones.map((ringtone) => (
            <SettingRow
              key={ringtone.id}
              label={ringtone.name}
              onPress={() =>
                setSettings((current) => ({
                  ...current,
                  selectedId: ringtone.id,
                }))
              }
            >
              <RadioIndicator selected={settings.selectedId === ringtone.id} />
            </SettingRow>
          ))}
        </SettingCard>
      </View>

      <View className="mt-5 gap-1.5">
        <SettingSectionLabel>기본 벨소리</SettingSectionLabel>
        <SettingCard>
          {DEFAULT_RINGTONES.map((ringtone) => (
            <SettingRow
              key={ringtone.id}
              label={ringtone.name}
              onPress={() =>
                setSettings((current) => ({
                  ...current,
                  selectedId: ringtone.id,
                }))
              }
            >
              <RadioIndicator selected={settings.selectedId === ringtone.id} />
            </SettingRow>
          ))}
        </SettingCard>
      </View>
    </ProfileSettingsScreen>
  );
}
