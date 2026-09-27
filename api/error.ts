import { isAxiosError } from "axios";

type ApiErrorBody = {
  detail?: string | { msg?: string }[];
  message?: string;
  error?: {
    message?: string;
  };
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const detail = error.response?.data?.detail;
  const detailMessage = Array.isArray(detail)
    ? detail.find((item) => item.msg)?.msg
    : detail;

  return (
    error.response?.data?.error?.message ??
    error.response?.data?.message ??
    detailMessage ??
    fallback
  );
}

export function getApiErrorStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/** 게시글·댓글 작성/수정 시 콘텐츠 안전성 검사 오류를 사용자 문구로 변환합니다. */
export function getCommunityContentErrorMessage(
  error: unknown,
  fallback: string,
) {
  const status = getApiErrorStatus(error);

  if (status === 422) {
    return "커뮤니티 운영정책에 위반되는 내용은 등록할 수 없습니다.";
  }
  if (status === 503) {
    return "콘텐츠 안전성 검사를 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }

  return getApiErrorMessage(error, fallback);
}
