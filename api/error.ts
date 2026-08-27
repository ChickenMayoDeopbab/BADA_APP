import { isAxiosError } from "axios";

type ApiErrorBody = {
  detail?: string | { msg?: string }[];
  message?: string;
  error?: {
    message?: string;
  };
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorBody>(error)) return fallback;

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
