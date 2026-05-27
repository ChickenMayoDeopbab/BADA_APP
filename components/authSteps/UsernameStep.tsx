import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { router } from "expo-router";
import { useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type UsernameProps = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
};

export default function UsernameStep({
  email,
  setEmail,
  onNext,
}: UsernameProps) {
  const { width } = useWindowDimensions();
  const inputScale = Math.min(
    Math.max(width / 393, 0.94),
    width >= 600 ? 1.06 : 1,
  );
  const fieldAreaHeight = 82 * inputScale * 2 + 20 + 24 + 24;
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);

  const [verificationCode, setVerificationCode] = useState<string>("");
  return (
    <View>
      <View style={{ minHeight: fieldAreaHeight }}>
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <CustomInput
              value={email}
              onChangeText={setEmail}
              label="이메일"
              autoCapitalize="none"
            />
          </View>

          <View style={{ marginTop: 18, width: codeButtonWidth }}>
            <CustomButton
              label="인증코드 전송"
              variant="lg"
              backgroundColor="#0AE365"
            />
          </View>
        </View>

        <CustomInput
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="인증코드를 입력하세요."
          label="인증코드"
        />
      </View>

      <View className="gap-y-3">
        <CustomButton
          label="인증하기"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={onNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity
          onPress={() => {
            router.replace("/auth");
          }}
        >
          <Text className="text-sm text-[#5C5E5E]">이미 계정이 있어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
