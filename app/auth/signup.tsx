import BadaLogo from "@/assets/badaLogo2.svg";
import NicknameStep from "@/components/authSteps/NicknameStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const formBottomMargin = Math.min(Math.max(height * 0.17, 96), 176);
  const [step, setStep] = useState<number>(1);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            className="justify-between flex-1 px-8"
            style={{
              paddingTop: topPadding,
              width: "100%",
              maxWidth: isTablet ? 430 : undefined,
              alignSelf: "center",
              minHeight: height,
            }}
          >
            <View className="flex-1">
              <BadaLogo width={70} height={32} />
              <Text className=" text-3xl font-bold text-[#0D0D0E]">
                회원가입
              </Text>
            </View>

            <View className="flex-1" style={{ marginBottom: formBottomMargin }}>
              {step === 1 && (
                <UsernameStep
                  email={email}
                  setEmail={setEmail}
                  onNext={() => setStep(2)}
                />
              )}

              {step === 2 && (
                <PasswordStep
                  password={password}
                  setPassword={setPassword}
                  onPrev={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}

              {step === 3 && (
                <NicknameStep
                  nickname={nickname}
                  setNickname={setNickname}
                  onPrev={() => setStep(2)}
                  onNext={() => setStep(4)}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
