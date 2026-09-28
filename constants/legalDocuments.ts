import {
  COMMUNITY_SAFETY_NOTICE,
  DEVELOPER_CONTACT_EMAIL,
  TRAINING_RECORD_RETENTION_NOTICE,
  VOICE_DATA_RETENTION_NOTICE,
} from "@/constants/legal";

export interface LegalDocumentSection {
  title: string;
  body: string;
}

export const TERMS_OF_SERVICE_SECTIONS: LegalDocumentSection[] = [
  {
    title: "서비스 이용",
    body: "바다는 전화 불안 완화와 대화 훈련을 돕는 서비스입니다. 회원은 관련 법령과 본 약관 및 서비스 운영정책을 준수해야 합니다.",
  },
  {
    title: "커뮤니티 운영정책",
    body: COMMUNITY_SAFETY_NOTICE,
  },
  {
    title: "서비스 이용 제한",
    body: "운영정책을 위반하거나 서비스의 정상적인 운영을 방해한 경우 게시물 삭제, 기능 제한 또는 서비스 이용 제한 등의 조치가 이루어질 수 있습니다.",
  },
  {
    title: "문의",
    body: `서비스 이용약관 관련 문의: ${DEVELOPER_CONTACT_EMAIL}`,
  },
];

export const PRIVACY_POLICY_SECTIONS: LegalDocumentSection[] = [
  {
    title: "수집하는 개인정보",
    body: "회원 식별을 위한 계정 정보와 서비스 이용 과정에서 생성되는 훈련 내용, 음성 데이터 및 분석 결과를 처리할 수 있습니다.",
  },
  {
    title: "이용 목적",
    body: "회원 식별, 대화 훈련 제공, 맞춤형 분석과 피드백 제공 및 서비스 이용 기록 관리에 사용합니다.",
  },
  {
    title: "보관 및 파기",
    body: `${VOICE_DATA_RETENTION_NOTICE}\n${TRAINING_RECORD_RETENTION_NOTICE}\n보관기간이 지나거나 삭제 사유가 발생하면 복구할 수 없는 방법으로 지체 없이 파기합니다.`,
  },
  {
    title: "이용자의 권리",
    body: "회원은 자신의 개인정보 열람·정정·삭제 및 처리정지를 요청할 수 있으며, 훈련 기록 삭제 또는 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.",
  },
  {
    title: "개인정보 문의",
    body: DEVELOPER_CONTACT_EMAIL,
  },
];

export const SENSITIVE_INFORMATION_SECTIONS: LegalDocumentSection[] = [
  {
    title: "처리 항목",
    body: "통화불안 진단 응답과 점수, 음성 분석 결과, 진단·훈련 분석 결과 및 피드백을 처리합니다.",
  },
  {
    title: "처리 목적",
    body: "통화불안 진단, 불안 점수 저장, 음성 분석 및 개인화된 진단·훈련 결과와 피드백 제공에 사용합니다.",
  },
  {
    title: "동의 거부 및 철회",
    body: "민감정보 처리 동의는 선택 사항입니다. 동의하지 않아도 일반 서비스를 이용할 수 있으나 관련 진단·분석 기능은 제한됩니다. 동의 후에도 개인정보 관리 화면에서 언제든 철회할 수 있습니다.",
  },
];
