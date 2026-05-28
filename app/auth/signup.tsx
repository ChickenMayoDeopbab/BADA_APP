import { postSignup } from "@/api/authApi";
import BadaLogo from "@/assets/badaLogo2.svg";
import EmailStep from "@/components/authSteps/EmailStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";

import { router } from "expo-router";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const formBottomMargin = Math.min(Math.max(height * 0.17, 96), 176);
  const [step, setStep] = useState<number>(1);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  const handleSignup = async () => {
    try {
      const response = await postSignup({ email, password, username });
      router.push("/auth/login");
    } catch (error) {}
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
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
          <Text className=" text-3xl font-bold text-[#0D0D0E]">회원가입</Text>
        </View>

        <View className="flex-1" style={{ marginBottom: formBottomMargin }}>
          {step === 1 && (
            <EmailStep
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
            <UsernameStep
              username={username}
              setUsername={setUsername}
              onPrev={() => setStep(2)}
              onNext={handleSignup}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
