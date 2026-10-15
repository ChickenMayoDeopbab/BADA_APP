/** 토큰 부재·손상 또는 갱신 서버의 명시적인 인증 거부만 로그인 만료로 구분한다. */
export class AuthSessionExpiredError extends Error {
  constructor() {
    super("로그인 기간이 만료됐어요. 다시 로그인해 주세요.");
    this.name = "AuthSessionExpiredError";
  }
}
