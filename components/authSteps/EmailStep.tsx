import { postEmailCheck, postEmailSend } from "@/api/authApi";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type EmailProps = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onNext: () => void;
};

export default function EmailStep({
  email,
  setEmail,
  inputTranslateY,
  onNext,
}: EmailProps) {
  const { width } = useWindowDimensions();
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);

  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isSent, setIsSent] = useState<boolean>(false);

  const verificationRef = useRef<TextInput>(null);

  const handleEmailSend = async () => {
    try {
      await postEmailSend({ email });
      setIsSent(true);
    } catch {}
  };

  const handleEmailCheck = async () => {
    try {
      await postEmailCheck({ email, authNum: verificationCode });
      onNext();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View>
      <Animated.View
        className="mb-5"
        style={{ transform: [{ translateY: inputTranslateY }] }}
      >
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <CustomInput
              value={email}
              onChangeText={setEmail}
              label="이메일"
              autoCapitalize="none"
              error={isSent ? "인증코드가 전송됐습니다." : ""}
              returnKeyType="next"
              onSubmitEditing={() => verificationRef.current?.focus()}
            />
          </View>
          <View style={{ marginTop: 18, width: codeButtonWidth }}>
            <CustomButton
              label="인증코드 전송"
              variant="lg"
              backgroundColor="#0AE365"
              onPress={handleEmailSend}
            />
          </View>
        </View>

        <CustomInput
          ref={verificationRef}
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="인증코드를 입력하세요."
          label="인증코드"
          returnKeyType="done"
          onSubmitEditing={handleEmailCheck}
        />
      </Animated.View>
      
      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="인증하기"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={onNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={() => router.replace("/auth")}>
          <Text className="text-sm text-[#5C5E5E]">이미 계정이 있어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
