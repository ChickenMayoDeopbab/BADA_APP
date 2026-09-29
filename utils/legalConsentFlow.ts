import { isDiagnosisRequiredForAuthenticatedUser } from "@/utils/diagnosisFlow";

export type AuthenticatedPath =
  | "/diagnosis/welcome"
  | "/home";

export const getAuthenticatedAppPath = async (): Promise<AuthenticatedPath> => {
  const needsDiagnosis = await isDiagnosisRequiredForAuthenticatedUser();
  return needsDiagnosis ? "/diagnosis/welcome" : "/home";
};

export const getAuthenticatedPath = async (): Promise<AuthenticatedPath> => {
  return getAuthenticatedAppPath();
};
