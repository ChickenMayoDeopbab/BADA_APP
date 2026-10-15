export const OAUTH_CALLBACK_URL = "bada://auth/callback";

/** 네이티브 콜백의 두 URL 표기를 동일하게 검증하고 인증 결과만 추출한다. */
export const parseOAuthCallback = (url: string) => {
  const callback = new URL(url);
  const path = `${callback.hostname}${callback.pathname}`
    .replace(/^\/+/, "")
    .replace(/\/$/, "");
  if (callback.protocol !== "bada:" || path !== "auth/callback") {
    throw new Error("올바르지 않은 소셜 로그인 응답입니다.");
  }
  const params = {
    code: callback.searchParams.get("code")?.trim() ?? "",
    error: callback.searchParams.get("error")?.trim() ?? "",
    error_description: callback.searchParams.get("error_description") ?? "",
    message: callback.searchParams.get("message") ?? "",
  };
  if (!params.code && !params.error) {
    throw new Error("로그인 인증코드를 받지 못했어요. 다시 로그인해 주세요.");
  }
  return params;
};
