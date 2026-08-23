import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

interface SearchIconButtonProps {
  /** 없으면 눌리지 않는 장식용 아이콘으로 렌더링된다 */
  onPress?: () => void;
  /** 아이콘 크기 (기본 28) */
  size?: number;
}

/**
 * 검색 아이콘 버튼.
 * 디자인의 Search 컴포넌트 variant를 그대로 옮긴 것으로,
 * 눌린 동안에만 fill/alternative 배경이 깔린다(default / onPress).
 *
 * NativeWind의 active: 변형 대신 Pressable의 pressed 상태를 직접 쓴다.
 * 배경색 전환은 이 버튼의 명시적인 디자인 상태라 플랫폼에 관계없이
 * 확실히 동작하는 쪽을 택했다.
 */
export default function SearchIconButton({
  onPress,
  size = 28,
}: SearchIconButtonProps) {
  const icon = <Ionicons name="search" size={size} color="#0D0D0E" />;

  // 누를 수 없는 경우에는 눌림 효과 없이 아이콘만 보여준다
  if (!onPress) {
    return (
      <View className="h-10 w-10 items-center justify-center">{icon}</View>
    );
  }

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <View
          className={`h-10 w-10 items-center justify-center rounded-component ${
            pressed ? "bg-fill-alternative" : "bg-transparent"
          }`}
        >
          {icon}
        </View>
      )}
    </Pressable>
  );
}
