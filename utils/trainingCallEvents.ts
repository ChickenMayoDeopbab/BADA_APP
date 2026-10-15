const listeners = new Set<() => void>();

/** 푸시는 조회 신호로만 사용하고 실제 예약 상태는 서버에서 다시 확인한다. */
export const notifyTrainingCallUpdate = (): void => {
  for (const listener of listeners) listener();
};

/** 기존 푸시 구독을 재사용해 예약 감시기에 상태 확인 신호를 전달한다. */
export const subscribeTrainingCallUpdates = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
