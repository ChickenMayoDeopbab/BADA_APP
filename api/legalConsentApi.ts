import apiClient from "./client";
import {
  AcceptLegalConsentRequest,
  ApiResponse,
  LegalConsentStatus,
} from "./types";

type LegalConsentResponse =
  | LegalConsentStatus
  | ApiResponse<LegalConsentStatus>;

const unwrapLegalConsentStatus = (
  response: LegalConsentResponse,
): LegalConsentStatus => {
  if ("legalActionRequired" in response) return response;
  return response.data;
};

export const getLegalConsentStatus = async (): Promise<LegalConsentStatus> => {
  const response = await apiClient.get<LegalConsentResponse>(
    "/api/v1/legal-consents/status",
  );

  return unwrapLegalConsentStatus(response.data);
};

export const acceptLegalConsents = async (
  data: AcceptLegalConsentRequest,
): Promise<LegalConsentStatus> => {
  const response = await apiClient.post<LegalConsentResponse>(
    "/api/v1/legal-consents/accept",
    data,
  );

  return unwrapLegalConsentStatus(response.data);
};

export const withdrawSensitiveInformationConsent = async (): Promise<void> => {
  await apiClient.delete(
    "/api/v1/legal-consents/sensitive-information",
  );
};
