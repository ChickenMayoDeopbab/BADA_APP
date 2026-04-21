import * as S from "./Top.styles"
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';

interface TopProps {
  title?: string;
  isMain?: boolean;
  back?: boolean;
}

export default function Top({ title, isMain = false, back = false }: TopProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <S.TopContainer $top={insets.top}>
      {back ? (
        <S.backBtn onPress={() => router.back()}>
          <Ionicons name="chevron-back-sharp" size={30} color="black" />
        </S.backBtn>
      ) : <></>}

      {isMain ? (
        <Image source={require("/Users/ahxn/bada/assets/badaLogo2.png")} resizeMode="contain" style={{ width: 90, marginTop: 10, marginBottom: 10 }} />
      ) : (
        <S.Title>{title}</S.Title>
      )}
    </S.TopContainer>
  );
}