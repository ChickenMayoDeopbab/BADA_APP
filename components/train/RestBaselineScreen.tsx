import CustomButton from "@/components/common/CustomButton";
import CallBackground from "@/components/train/CallBackground";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** 서버가 앞 60초를 버리고 남은 60초 이상으로 기준선을 잡으므로 2분 쉰다. */
const REST_DURATION_MS = 2 * 60 * 1000;

/** 남은 시간을 M:SS로 보여 준다. */
const formatRemaining = (remainingMs: number): string => {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

interface RestBaselineScreenProps {
  onFinish: () => void; // 2분이 지나거나 건너뛰면 한 번 부른다
}

/** 통화 전 2분 휴식 화면. 워치가 이 동안 평소 몸 상태(기준선)를 잰다. */
export default function RestBaselineScreen({ onFinish }: RestBaselineScreenProps) {
  const insets = useSafeAreaInsets();
  const [remainingMs, setRemainingMs] = useState(REST_DURATION_MS);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const isFinishedRef = useRef(false);

  const finish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    onFinishRef.current();
  }, []);

  useEffect(() => {
    // 벽시계 기준이라 잠시 백그라운드에 다녀와도 2분이 지났으면 바로 끝난다.
    const endsAt = Date.now() + REST_DURATION_MS;
    const interval = setInterval(() => {
      const remaining = Math.max(0, endsAt - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) finish();
    }, 250);
    return () => clearInterval(interval);
  }, [finish]);

  return (
    <View className="flex-1">
      <CallBackground />
      <View
        className="flex-1 px-[33px]"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="flex-1 items-center justify-center gap-y-4">
          <Text className="text-title2 font-bold text-label-normal text-center">
            통화 전에 2분만 쉬어 갈게요
          </Text>
          <Text className="text-body font-medium text-label-alternative text-center">
            편하게 앉아서 말없이 쉬어 주세요.{"\n"}워치가 평소 몸의 상태를 재요.
          </Text>
          <Text
            accessibilityRole="timer"
            className="mt-6 text-display1 font-bold text-label-normal"
          >
            {formatRemaining(remainingMs)}
          </Text>
        </View>
        <CustomButton label="건너뛰기" tone="neutral" onPress={finish} />
      </View>
    </View>
  );
}
