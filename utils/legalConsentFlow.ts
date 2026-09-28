import { getLegalConsentStatus } from "@/api/legalConsentApi";
import { isDiagnosisRequiredForAuthenticatedUser } from "@/utils/diagnosisFlow";

export type AuthenticatedPath =
  | "/auth/terms"
  | "/diagnosis/welcome"
  | "/home";

export const getAuthenticatedAppPath = async (): Promise<
  Exclude<AuthenticatedPath, "/auth/terms">
> => {
  const needsDiagnosis = await isDiagnosisRequiredForAuthenticatedUser();
  return needsDiagnosis ? "/diagnosis/welcome" : "/home";
};

export const getAuthenticatedPath = async (): Promise<AuthenticatedPath> => {
  try {
    const status = await getLegalConsentStatus();
    if (status.legalActionRequired) return "/auth/terms";
    return getAuthenticatedAppPath();
  } catch {
    // 서버 상태를 확인하지 못한 경우 로컬 값으로 동의를 건너뛰지 않는다.
    // 동의 화면에서 재조회와 오류 안내를 제공한다.
    return "/auth/terms";
  }
};
