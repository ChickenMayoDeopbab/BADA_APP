import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import {
  RadioIndicator,
  SettingCard,
  SettingRow,
  SettingSectionLabel,
} from "@/components/profile/SettingControls";
import {
  DEFAULT_RINGTONE_SETTINGS,
  DEFAULT_RINGTONES,
  getRingtoneSource,
  RingtoneSettings,
} from "@/constants/ringtones";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import {
  loadRingtoneSettings,
  saveRingtoneSettings,
} from "@/utils/ringtoneSettings";
import { Ionicons } from "@expo/vector-icons";
import { AudioSource, useAudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

export default function RingtoneSettingsScreen() {
  const [initialSettings, setInitialSettings] = useState<RingtoneSettings>(
    DEFAULT_RINGTONE_SETTINGS,
  );
  const [settings, setSettings] = useState<RingtoneSettings>(
    DEFAULT_RINGTONE_SETTINGS,
  );
  const [previewSource, setPreviewSource] = useState<AudioSource>(null);
  const [previewRequest, setPreviewRequest] = useState(0);
  const [saving, setSaving] = useState(false);
  const previewPlayer = useAudioPlayer(previewSource);

  useEffect(() => {
    let active = true;

    void loadRingtoneSettings().then((loadedSettings) => {
      if (!active) return;
      setInitialSettings(loadedSettings);
      setSettings(loadedSettings);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!previewSource) return;

    try {
      previewPlayer.loop = false;
      void previewPlayer.seekTo(0);
      previewPlayer.play();
    } catch {
      Alert.alert("벨소리를 재생하지 못했어요", "다른 음원을 선택해 주세요.");
    }
  }, [previewPlayer, previewRequest, previewSource]);

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

      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const name = asset.name.replace(/\.[^/.]+$/, "") || asset.name;

      const nextSettings: RingtoneSettings = {
        selectedId: id,
        customRingtones: [
          ...settings.customRingtones,
          { id, name, uri: asset.uri },
        ],
      };

      setSettings(nextSettings);
      preview(nextSettings);
    } catch {
      Alert.alert("파일을 열지 못했어요", "잠시 후 다시 시도해 주세요.");
    }
  };

  const preview = (nextSettings: RingtoneSettings) => {
    setPreviewSource(getRingtoneSource(nextSettings));
    setPreviewRequest((request) => request + 1);
  };

  const selectRingtone = (selectedId: string) => {
    const nextSettings = { ...settings, selectedId };
    setSettings(nextSettings);
    preview(nextSettings);
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const persistedSettings = await saveRingtoneSettings(settings);
      setInitialSettings(persistedSettings);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("벨소리를 저장하지 못했어요", "잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <ProfileSettingsScreen
      title="벨소리 설정"
      hasChanges={hasChanges && !saving}
      onSave={() => void save()}
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
            size={32}
            color={SEMANTIC_COLORS.label.alternative}
          />
        </Pressable>
      }
    >
      <View className="gap-1.5">
        <SettingSectionLabel>내 벨소리</SettingSectionLabel>
        <SettingCard>
          {settings.customRingtones.length === 0 ? (
            <View className="h-14 w-full justify-center px-[22px]">
              <Text className="text-body text-label-alternative">
                + 버튼으로 음성 파일을 추가해 주세요
              </Text>
            </View>
          ) : (
            settings.customRingtones.map((ringtone) => (
              <SettingRow
                key={ringtone.id}
                label={ringtone.name}
                onPress={() => selectRingtone(ringtone.id)}
              >
                <RadioIndicator
                  selected={settings.selectedId === ringtone.id}
                />
              </SettingRow>
            ))
          )}
        </SettingCard>
      </View>

      <View className="mt-5 gap-1.5">
        <SettingSectionLabel>기본 벨소리</SettingSectionLabel>
        <SettingCard>
          {DEFAULT_RINGTONES.map((ringtone) => (
            <SettingRow
              key={ringtone.id}
              label={ringtone.name}
              onPress={() => selectRingtone(ringtone.id)}
            >
              <RadioIndicator selected={settings.selectedId === ringtone.id} />
            </SettingRow>
          ))}
        </SettingCard>
      </View>
    </ProfileSettingsScreen>
  );
}
