import { Image, type ImageSource } from "expo-image";
import { StyleSheet } from "react-native";

interface ScenarioImageProps {
  source: ImageSource | number;
}

// 원격 이미지가 도착했을 때 빈 카드에서 갑자기 바뀌지 않도록 짧게 페이드한다
const FADE_IN_MS = 200;

/**
 * 시나리오 카드 배경 이미지.
 * 부모 컨테이너를 꽉 채우고(넘치는 부분은 cover가 잘라냄),
 * 메모리·디스크 캐시로 목록 재조회·화면 재진입 시 다시 내려받지 않는다.
 */
export default function ScenarioImage({ source }: ScenarioImageProps) {
  return (
    <Image
      source={source}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={FADE_IN_MS}
    />
  );
}
