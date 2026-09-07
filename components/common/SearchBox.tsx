import Ionicons from "@expo/vector-icons/Ionicons";
import { TextInput, TextInputProps, View } from "react-native";

export default function SearchBox({ ...props }: TextInputProps) {
  return (
    <View className="flex-row items-center bg-[#F8F8F8] border border-[#BDBEBE] rounded-xl px-4 h-14">
      <TextInput
        className="flex-1 text-lg text-[#0D0D0E]"
        placeholderTextColor="#BDBEBE"
        {...props}
      />
      <Ionicons name="search" size={32} color="#BDBEBE" />
    </View>
  );
}
