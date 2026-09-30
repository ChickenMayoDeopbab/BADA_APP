import type {
  DiagnosisSubmitRequest,
  DiagnosisType,
  EmailSendRequest,
  EmailVerificationRequest,
  EmailVerificationType,
} from "./types";

/** 이메일 인증코드 전송 API의 필수 요청값을 생성합니다. */
export const createEmailSendRequest = (
  email: string,
  type: EmailVerificationType,
): EmailSendRequest => ({
  email: email.trim(),
  type,
});

/** 이메일 인증코드 확인 API의 필수 요청값을 생성합니다. */
export const createEmailVerificationRequest = (
  email: string,
  authNum: string,
  type: EmailVerificationType,
): EmailVerificationRequest => ({
  email: email.trim(),
  authNum: authNum.trim(),
  type,
});

/** 자가진단 제출 API 스펙에 맞는 요청값을 생성합니다. */
export const createDiagnosisSubmitRequest = (
  sessionId: string,
  type: DiagnosisType,
  answers: number[],
): DiagnosisSubmitRequest => ({
  sessionId,
  type,
  answers: [...answers],
});
