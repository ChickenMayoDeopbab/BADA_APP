import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { useState } from "react";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

type StepProps = {
  onNext: () => void;
  onPrev?: () => void;
};

export default function NicknameStep({ onPrev, onNext }: StepProps) {
  const { width } = useWindowDimensions();
  const inputScale = Math.min(Math.max(width / 393, 0.94), width >= 600 ? 1.06 : 1);
  const fieldAreaHeight = 82 * inputScale * 2 + 20 + 24 + 24;
  const [nickname, setNickname] = useState<string>("");


  return (
    <View>
      <View style={{ minHeight: fieldAreaHeight }}>
        <CustomInput value={nickname} onChangeText={setNickname} label="닉네임" />
      </View>

      <View className="gap-y-3">
        <CustomButton
          label="회원가입"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={onNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={onPrev}>
          <Text className="text-sm text-[#5C5E5E]">이전으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
