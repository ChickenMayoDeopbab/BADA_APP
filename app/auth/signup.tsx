import BadaLogo from "@/assets/badaLogo2.svg";
import NicknameStep from "@/components/authSteps/NicknameStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const [step, setStep] = useState(1);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="justify-between flex-1 px-8 pt-20">
        <View className="flex-1">
          <BadaLogo width={70} />
          <Text className=" text-3xl font-bold text-[#0D0D0E]">회원가입</Text>
        </View>

        <View className="flex-1 mb-44">
          {step === 1 && <UsernameStep onNext={() => setStep(2)} />}
          {step === 2 && <PasswordStep onPrev={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <NicknameStep onPrev={() => setStep(2)}  onNext={() => setStep(4)} />}
        </View>
      </View>
    </SafeAreaView>
  );
}
