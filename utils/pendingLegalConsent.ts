import AsyncStorage from "@react-native-async-storage/async-storage";
import { OptionalLegalConsents } from "@/api/types";

const PENDING_LEGAL_CONSENT_KEY = "pendingLegalConsent";

export interface PendingLegalConsent extends OptionalLegalConsents {
  username: string | null;
}

/** 회원가입에서 선택한 동의 값을 첫 로그인까지 보관한다. */
export const savePendingLegalConsent = async (
  consents: OptionalLegalConsents,
  username: string | null = null,
): Promise<void> => {
  const pending: PendingLegalConsent = {
    username,
    ...consents,
  };
  await AsyncStorage.setItem(
    PENDING_LEGAL_CONSENT_KEY,
    JSON.stringify(pending),
  );
};

export const getPendingLegalConsent = async (): Promise<
  PendingLegalConsent | null
> => {
  const stored = await AsyncStorage.getItem(PENDING_LEGAL_CONSENT_KEY);
  if (!stored) return null;

  try {
    const pending = JSON.parse(stored) as Partial<PendingLegalConsent>;
    if (typeof pending.sensitiveInformationAgreed !== "boolean") return null;
    if (
      pending.profileImageAgreed !== undefined &&
      typeof pending.profileImageAgreed !== "boolean"
    ) {
      return null;
    }
    return {
      username: typeof pending.username === "string" ? pending.username : null,
      sensitiveInformationAgreed: pending.sensitiveInformationAgreed,
      // 이전 앱에서 저장한 값에는 이미지 동의가 없으므로 미동의로 처리한다.
      profileImageAgreed: pending.profileImageAgreed ?? false,
    };
  } catch {
    return null;
  }
};

export const clearPendingLegalConsent = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
};
