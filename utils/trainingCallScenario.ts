import AsyncStorage from "@react-native-async-storage/async-storage";

/** 예약 응답에 없는 시나리오 ID를 보관해 앱 재시작 후에도 리포트까지 연결한다. */
export const saveTrainingCallScenario = async (
  scheduleId: number,
  scenarioId: number,
): Promise<void> => {
  await AsyncStorage.setItem(
    `trainingCallScenario:${scheduleId}`,
    String(scenarioId),
  );
};

/** 다른 기기에서 생성한 예약 또는 손상된 저장값은 시나리오를 추정하지 않는다. */
export const getTrainingCallScenario = async (
  scheduleId: number,
): Promise<string | undefined> => {
  try {
    const value = await AsyncStorage.getItem(
      `trainingCallScenario:${scheduleId}`,
    );
    const scenarioId = Number(value);
    return Number.isSafeInteger(scenarioId) && scenarioId > 0
      ? String(scenarioId)
      : undefined;
  } catch {
    return undefined;
  }
};

/** 수락하거나 취소한 예약의 기기 저장값을 정리한다. */
export const removeTrainingCallScenario = async (
  scheduleId: number,
): Promise<void> => {
  await AsyncStorage.removeItem(`trainingCallScenario:${scheduleId}`);
};
