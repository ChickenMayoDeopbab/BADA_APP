import { postOAuthToken } from "@/api/authApi";
import { getMyPage } from "@/api/userInfoApi";
import { clearAuthTokens, setAuthTokens } from "@/utils/authTokenStorage";
import { syncAuthenticatedDiagnosisRequirement } from "@/utils/diagnosisFlow";
import {
  getAuthenticatedPath,
  type AuthenticatedPath,
} from "@/utils/legalConsentFlow";
import AsyncStorage from "@react-native-async-storage/async-storage";

type OAuthDestination =
  | AuthenticatedPath
  | { pathname: "/auth/terms"; params: { newUser: "true" } };
const loginByCode = new Map<
  string,
  { promise: Promise<OAuthDestination>; expiresAt: number }
>();

/** 토큰 저장과 프로필 동기화까지 포함한 로그인 완료 절차를 실행한다. */
const finishOAuthLogin = async (code: string): Promise<OAuthDestination> => {
  const response = await postOAuthToken({ code });
  const { accessToken, refreshToken, isNewUser } = response.data ?? {};
  if (!accessToken || !refreshToken)
    throw new Error("소셜 로그인 인증 정보를 받지 못했어요.");
  try {
    await setAuthTokens({ accessToken, refreshToken }, "oauth");
    await AsyncStorage.setItem("autoLogin", "true");
  } catch (error) {
    await Promise.allSettled([
      clearAuthTokens(),
      AsyncStorage.removeItem("autoLogin"),
    ]);
    throw error;
  }
  try {
    const { data: profile } = await getMyPage();
    await syncAuthenticatedDiagnosisRequirement(
      profile.username,
      !(profile.diagnosisDate || profile.level || profile.levelName),
    );
  } catch {
    // 프로필 조회 실패는 기존 로그인과 동일하게 다음 조회에서 복구한다.
  }
  return isNewUser
    ? { pathname: "/auth/terms", params: { newUser: "true" } }
    : getAuthenticatedPath();
};

/** 딥 링크와 인증 세션이 같은 코드를 전달해도 전체 로그인 절차를 한 번만 수행한다. */
export const completeOAuthLoginOnce = (
  code: string,
): Promise<OAuthDestination> => {
  for (const [key, entry] of loginByCode) {
    if (entry.expiresAt <= Date.now()) loginByCode.delete(key);
  }
  const existing = loginByCode.get(code);
  if (existing) return existing.promise;
  const entry = { promise: finishOAuthLogin(code), expiresAt: Infinity };
  loginByCode.set(code, entry);
  const expire = () => {
    entry.expiresAt = Date.now() + 30_000;
  };
  void entry.promise.then(expire, expire);
  return entry.promise;
};
