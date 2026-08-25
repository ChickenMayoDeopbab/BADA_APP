import { ReactNode } from "react";
import { Pressable, PressableProps, View } from "react-native";

interface GlassChipProps extends PressableProps {
  children: ReactNode;
  /** 안쪽 박스에 덧붙일 클래스 (크기·여백 조정용) */
  containerClassName?: string;
}

/**
 * 카드 이미지 위에 올라가는 반투명 유리 질감 칩.
 * 「자세히 보기」, 「예시 대화 듣기」, 카드의 통화 뱃지에 공통으로 쓰인다.
 * onPress를 넘기지 않으면 터치를 통과시켜 카드 전체가 눌리도록 한다.
 */
export default function GlassChip({
  children,
  containerClassName = "px-[10px] py-[6px]",
  onPress,
  ...props
}: GlassChipProps) {
  const content = (
    <View
      className={`flex-row items-center justify-center gap-x-2 rounded-control border border-[rgba(255,255,255,0.29)] bg-[rgba(255,255,255,0.12)] ${containerClassName}`}
    >
      {children}
    </View>
  );

  if (!onPress) return <View pointerEvents="none">{content}</View>;

  return (
    <Pressable onPress={onPress} className="active:opacity-70" {...props}>
      {content}
    </Pressable>
  );
}
