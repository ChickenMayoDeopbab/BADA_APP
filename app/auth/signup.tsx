import { postSignup } from "@/api/authApi";
import BadaLogo from "@/assets/badaLogo2.svg";
import EmailStep from "@/components/authSteps/EmailStep";
import PasswordStep from "@/components/authSteps/PasswordStep";
import UsernameStep from "@/components/authSteps/UsernameStep";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const inputTop = Math.min(Math.max(height * 0.4, 260), 380);
  const headerHeight = 74;
  const formTopMargin = Math.max(inputTop - topPadding - headerHeight, 40);
  const inputScale = Math.min(
    Math.max(width / 393, 0.94),
    width >= 600 ? 1.06 : 1,
  );
  const inputAreaHeight = 82 * inputScale * 2 + 20 + 24 + 24;
  const [step, setStep] = useState<number>(1);
  const inputTranslateY = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [userInfo, setUserInfo] = useState<{
    userId: string;
    username: string;
  }>({
    username: "",
    userId: "",
  });

  const handleSignup = async () => {
    try {
      await postSignup({
        email,
        password,
        name: userInfo.userId,
        username: userInfo.username,
      });
      router.push("/auth/login");
    } catch {}
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(inputTranslateY, {
        toValue: -80,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inputTranslateY]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="flex-1 px-8"
            style={{
              paddingTop: topPadding,
              width: "100%",
              maxWidth: isTablet ? 430 : undefined,
              alignSelf: "center",
              minHeight: height,
            }}
          >
            <View>
              <BadaLogo width={70} height={32} />
              <Text className=" text-3xl font-bold text-[#0D0D0E]">
                회원가입
              </Text>
            </View>

            <View style={{ marginTop: formTopMargin }}>
              {step === 1 && (
                <EmailStep
                  email={email}
                  setEmail={setEmail}
                  inputTranslateY={inputTranslateY}
                  inputAreaHeight={inputAreaHeight}
                  onNext={() => setStep(2)}
                />
              )}

              {step === 2 && (
                <PasswordStep
                  password={password}
                  setPassword={setPassword}
                  inputTranslateY={inputTranslateY}
                  inputAreaHeight={inputAreaHeight}
                  onPrev={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}

              {step === 3 && (
                <UsernameStep
                  userInfo={userInfo}
                  setUserInfo={setUserInfo}
                  inputTranslateY={inputTranslateY}
                  inputAreaHeight={inputAreaHeight}
                  onPrev={() => setStep(2)}
                  onNext={handleSignup}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
