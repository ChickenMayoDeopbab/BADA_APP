import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_DIAGNOSIS_USERNAME = "pendingDiagnosisUsername";
const AUTHENTICATED_USERNAME = "authenticatedUsername";

export const markDiagnosisRequired = async (username: string) => {
  await AsyncStorage.setItem(PENDING_DIAGNOSIS_USERNAME, username);
};

export const setAuthenticatedUsername = async (username: string) => {
  await AsyncStorage.setItem(AUTHENTICATED_USERNAME, username);
};

/** 로그인한 사용자의 서버 진단 상태를 로컬 필수 진단 상태와 동기화한다. */
export const syncAuthenticatedDiagnosisRequirement = async (
  username: string,
  isDiagnosisRequired: boolean,
) => {
  const pendingUsername = await AsyncStorage.getItem(
    PENDING_DIAGNOSIS_USERNAME,
  );

  await setAuthenticatedUsername(username);

  if (isDiagnosisRequired) {
    await markDiagnosisRequired(username);
    return;
  }

  if (pendingUsername === username) {
    await AsyncStorage.removeItem(PENDING_DIAGNOSIS_USERNAME);
  }
};

export const isDiagnosisRequired = async (username: string) => {
  const pendingUsername = await AsyncStorage.getItem(
    PENDING_DIAGNOSIS_USERNAME,
  );

  return pendingUsername === username;
};

export const isDiagnosisRequiredForAuthenticatedUser = async () => {
  const [pendingUsername, authenticatedUsername] = await Promise.all([
    AsyncStorage.getItem(PENDING_DIAGNOSIS_USERNAME),
    AsyncStorage.getItem(AUTHENTICATED_USERNAME),
  ]);

  return (
    pendingUsername !== null && pendingUsername === authenticatedUsername
  );
};

export const completeRequiredDiagnosis = async () => {
  await AsyncStorage.removeItem(PENDING_DIAGNOSIS_USERNAME);
};
