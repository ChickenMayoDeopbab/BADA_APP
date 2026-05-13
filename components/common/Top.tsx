import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import BadaLogo from "@/assets/badaLogo2.svg";

interface TopProps {
  title?: string;
  isMain?: boolean;
  back?: boolean;
  onBack?: () => void;
}

export default function Top({ title, isMain = false, back = false, onBack }: TopProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();  
    } else {
      router.back(); 
    }
  };

  return (
    <View
      className="w-full flex justify-center items-center relative h-[105px]"
      style={{ paddingTop: insets.top }}
    >
      {back ? (
        <TouchableOpacity onPress={handleBack} className="absolute left-[30px] top-[50px]">
          <Ionicons name="chevron-back-sharp" size={30} color="black" />
        </TouchableOpacity>
      ) : <></>}

      {isMain ? (
        <BadaLogo className="w-[90%] my-[10px]" />
      ) : (
        <Text className="text-xl font-bold my-[10px]">{title}</Text>
      )}
    </View>
  );
}