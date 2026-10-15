import AsyncStorage from "@react-native-async-storage/async-storage";

const SCENARIO_KEY_PREFIX = "trainingCallScenario:";
const DAY_MS = 24 * 60 * 60 * 1000;
const LEGACY_RETENTION_MS = 7 * DAY_MS;

interface StoredScenario {
  scenarioId: number;
  expiresAt: number;
}

// Serialize migration/cleanup with writes so logout cannot race a pending migration.
let storageOperations: Promise<unknown> = Promise.resolve();

/** 같은 저장 영역의 읽기·쓰기·삭제를 순서대로 실행한다. */
function runStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const task = storageOperations.then(operation);
  storageOperations = task.catch(() => {});
  return task;
}

/** 기존 숫자 형식도 읽고 날짜가 없는 이전 예약은 마이그레이션 후 7일간 보관한다. */
const parseScenario = (value: string | null, now: number): StoredScenario | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return { scenarioId: parsed, expiresAt: now + LEGACY_RETENTION_MS };
    }
    if (
      parsed && Number.isSafeInteger(parsed.scenarioId) && parsed.scenarioId > 0 &&
      Number.isFinite(parsed.expiresAt) && parsed.expiresAt > now
    ) return { scenarioId: parsed.scenarioId, expiresAt: parsed.expiresAt };
  } catch {
    // 손상된 값으로 시나리오를 추정하지 않는다.
  }
  return null;
};

/** 서버 예정 시각 이후 하루까지만 보관하고 날짜가 없으면 7일 뒤 만료한다. */
export const saveTrainingCallScenario = (
  scheduleId: number,
  scenarioId: number,
  scheduledAt?: string,
): Promise<void> => runStorageOperation(async () => {
  const scheduledTime = scheduledAt ? Date.parse(scheduledAt) : NaN;
  const now = Date.now();
  const expiresAt = Number.isFinite(scheduledTime)
    ? Math.max(now, scheduledTime) + DAY_MS
    : now + LEGACY_RETENTION_MS;
  await AsyncStorage.setItem(
    `${SCENARIO_KEY_PREFIX}${scheduleId}`,
    JSON.stringify({ scenarioId, expiresAt }),
  );
});

/** 다른 기기의 예약·만료·손상된 값은 시나리오를 추정하지 않는다. */
export const getTrainingCallScenario = (
  scheduleId: number,
): Promise<string | undefined> => runStorageOperation(async () => {
  try {
    const key = `${SCENARIO_KEY_PREFIX}${scheduleId}`;
    const value = await AsyncStorage.getItem(key);
    const record = parseScenario(value, Date.now());
    if (!record) {
      if (value) await AsyncStorage.removeItem(key);
      return undefined;
    }
    if (value !== JSON.stringify(record)) {
      await AsyncStorage.setItem(key, JSON.stringify(record)).catch(() => {});
    }
    return String(record.scenarioId);
  } catch {
    return undefined;
  }
});

/** 수락하거나 취소한 예약의 기기 저장값을 정리한다. */
export const removeTrainingCallScenario = (scheduleId: number): Promise<void> =>
  runStorageOperation(() => AsyncStorage.removeItem(`${SCENARIO_KEY_PREFIX}${scheduleId}`));

/** 화면 진입 시 만료·손상된 예약을 정리하고 기존 숫자 형식을 한 번만 이전한다. */
export const pruneExpiredTrainingCallScenarios = (): Promise<void> => runStorageOperation(async () => {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SCENARIO_KEY_PREFIX));
  if (!keys.length) return;
  const records = await AsyncStorage.multiGet(keys);
  const expired: string[] = [];
  const migrations: [string, string][] = [];
  const now = Date.now();
  for (const [key, value] of records) {
    const record = parseScenario(value, now);
    if (!record) expired.push(key);
    else if (value !== JSON.stringify(record)) migrations.push([key, JSON.stringify(record)]);
  }
  if (expired.length) await AsyncStorage.multiRemove(expired);
  if (migrations.length) await AsyncStorage.multiSet(migrations);
});

/** 로그아웃·탈퇴·인증 초기화에서 이전 계정의 예약 연결 정보를 모두 제거한다. */
export const clearTrainingCallScenarios = (): Promise<void> => runStorageOperation(async () => {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SCENARIO_KEY_PREFIX));
  if (keys.length) await AsyncStorage.multiRemove(keys);
});
