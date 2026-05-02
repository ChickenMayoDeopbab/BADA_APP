import { Text, TouchableOpacity } from "react-native";

type BtnProps = {
  isDisabled?: boolean;
  onClick?: () => void;
  label?: string;
}

export default function GreenBtn({ isDisabled, onClick, label }: BtnProps) {
  return (
    <TouchableOpacity className={`bg-[#0AE365] flex-row justify-center p-4 rounded-xl mb-10 ${isDisabled ? 'opacity-100' : 'opacity-50'}`} onPress={onClick} disabled={isDisabled}>
      <Text className="text-lg font-bold text-white">{label}</Text>
    </TouchableOpacity>
  )
}