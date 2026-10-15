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

/** 현재 사용자의 프로필 이미지 처리 동의를 철회하고 갱신된 상태를 반환한다. */
export const withdrawProfileImageConsent = async (): Promise<LegalConsentStatus> => {
  const response = await apiClient.delete<LegalConsentResponse>(
    "/api/v1/legal-consents/profile-image",
  );
  return unwrapLegalConsentStatus(response.data);
};
