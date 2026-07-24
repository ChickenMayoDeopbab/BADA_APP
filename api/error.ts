import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  error?: {
    message?: string;
  };
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorBody>(error)) return fallback;

  return (
    error.response?.data?.error?.message ??
    error.response?.data?.message ??
    fallback
  );
}

export function getApiErrorStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}
