import { View } from "react-native";

interface StepProgressProps {
  /** 전체 단계 수 */
  total: number;
  /** 현재 단계 (1부터 시작) */
  current: number;
}

/** 화면 상단에 단계별 진행 상황을 표시하는 막대 */
export default function StepProgress({ total, current }: StepProgressProps) {
  return (
    <View className="flex-row gap-[6px]">
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          className={`h-1 flex-1 rounded-pill ${
            index < current ? "bg-primary-normal" : "bg-fill-neutral"
          }`}
        />
      ))}
    </View>
  );
}
