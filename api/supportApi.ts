import aiApiClient from "./aiClient";

export interface InquiryRequest {
  title: string;
  content: string;
}

/** 문의와 서비스 피드백을 고객 문의 API로 전송한다. */
export const sendInquiry = async (request: InquiryRequest): Promise<void> => {
  await aiApiClient.post("/api/v1/inquiries", request);
};
