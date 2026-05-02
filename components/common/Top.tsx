import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, Text, TouchableOpacity, View } from "react-native";
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
    <View
      className="w-full flex justify-center items-center relative h-[105px]"
      style={{ paddingTop: insets.top }}
    >
      {back ? (
        <TouchableOpacity onPress={() => router.back()} className="absolute left-[30px] top-[50px]">
          <Ionicons name="chevron-back-sharp" size={30} color="black" />
        </TouchableOpacity>
      ) : <></>}

      {isMain ? (
        <Image source={require("@/assets/badaLogo2.png")} resizeMode="contain" className="w-[90%] my-[10px]" />
      ) : (
        <Text className="text-xl font-bold my-[10px]">{title}</Text>
      )}
    </View>
  );
}