import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_LEGAL_CONSENT_KEY = "pendingLegalConsent";

export interface PendingLegalConsent {
  username: string | null;
  sensitiveInformationAgreed: boolean;
}

export const savePendingLegalConsent = async (
  sensitiveInformationAgreed: boolean,
  username: string | null = null,
): Promise<void> => {
  const pending: PendingLegalConsent = {
    username,
    sensitiveInformationAgreed,
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
    return {
      username: typeof pending.username === "string" ? pending.username : null,
      sensitiveInformationAgreed: pending.sensitiveInformationAgreed,
    };
  } catch {
    return null;
  }
};

export const clearPendingLegalConsent = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
};
