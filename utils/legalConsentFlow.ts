import { getLegalConsentStatus } from "@/api/legalConsentApi";
import { isDiagnosisRequiredForAuthenticatedUser } from "@/utils/diagnosisFlow";

export type AuthenticatedAppPath =
  | "/diagnosis/welcome"
  | "/home";

export type AuthenticatedPath = AuthenticatedAppPath | "/auth/terms";

export const getAuthenticatedAppPath = async (): Promise<AuthenticatedAppPath> => {
  const needsDiagnosis = await isDiagnosisRequiredForAuthenticatedUser();
  return needsDiagnosis ? "/diagnosis/welcome" : "/home";
};

export const getAuthenticatedPath = async (): Promise<AuthenticatedPath> => {
  try {
    const status = await getLegalConsentStatus();
    if (status.legalActionRequired) return "/auth/terms";
    return getAuthenticatedAppPath();
  } catch {
    // 필수 동의 상태를 확인하지 못한 경우 동의하지 않은 사용자를
    // 앱으로 통과시키지 않고 약관 화면에서 다시 시도하게 한다.
    return "/auth/terms";
  }
};
