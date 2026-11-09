import { getLegalConsentStatus } from "@/api/legalConsentApi";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import {
  SettingCard,
  SettingRow,
  SettingToggle,
} from "@/components/profile/SettingControls";
import { useAppAlert } from "@/context/AppAlertContext";
import { useBiosignalConsentGuard } from "@/hooks/useBiosignalConsentGuard";
import {
  loadBiosignalReportEnabled,
  saveBiosignalReportEnabled,
} from "@/utils/biosignalSettings";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function BodyReactionSettingsScreen() {
  const { showAlert } = useAppAlert();
  const ensureBiosignalConsent = useBiosignalConsentGuard();
  const [initialEnabled, setInitialEnabled] = useState<boolean | null>(null); // 저장된 설정 값
  const [isEnabled, setIsEnabled] = useState(false); // 화면에서 바꾼 설정 값
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;
    void (async () => {
      const isStoredEnabled = await loadBiosignalReportEnabled();
      let isAgreed = true;
      try {
        // 다른 기기에서 동의를 철회했다면 켜져 있어도 꺼진 상태로 보여준다.
        isAgreed = (await getLegalConsentStatus()).biosignalAgreed;
      } catch {
        // 상태 조회에 실패하면 저장된 값을 그대로 보여주고, 켤 때 동의 확인에서 다시 조회한다.
      }
      if (!isActive) return;
      const nextEnabled = isStoredEnabled && isAgreed;
      setInitialEnabled(nextEnabled);
      setIsEnabled(nextEnabled);
    })();
    return () => {
      isActive = false;
    };
  }, []);

  const hasChanges = initialEnabled !== null && isEnabled !== initialEnabled;

  /** 켤 때는 생체신호 동의를 먼저 확인하고, 동의하지 않으면 꺼진 채로 둔다. */
  const save = async () => {
    if (!hasChanges || isSaving) return;
    setIsSaving(true);
    try {
      if (isEnabled && !(await ensureBiosignalConsent())) {
        setIsEnabled(false);
        return;
      }
      await saveBiosignalReportEnabled(isEnabled);
      router.back();
    } catch {
      showAlert({
        title: "설정을 저장하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProfileSettingsScreen
      title="몸 반응 리포트"
      hasChanges={hasChanges && !isSaving}
      onSave={() => void save()}
    >
      {initialEnabled === null ? (
        <View className="items-center justify-center py-16">
          <LoadingIndicator />
        </View>
      ) : (
        <View className="gap-[19px]">
          <SettingCard>
            <SettingRow label="몸 반응 리포트">
              <SettingToggle
                label="몸 반응 리포트"
                value={isEnabled}
                disabled={isSaving}
                onValueChange={setIsEnabled}
              />
            </SettingRow>
          </SettingCard>
          <Text className="px-1 text-label leading-6 text-label-alternative">
            갤럭시 워치를 연결하고 통화 훈련을 하면, 통화가 끝난 뒤 리포트에서
            몸의 반응을 보여줘요. 켜려면 생체신호 처리 동의가 필요해요.
          </Text>
        </View>
      )}
    </ProfileSettingsScreen>
  );
}
