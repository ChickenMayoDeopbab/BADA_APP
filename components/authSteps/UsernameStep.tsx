import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type UsernameProps = {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function UsernameStep({
  username,
  setUsername,
  inputTranslateY,
  inputAreaHeight,
  onPrev,
  onNext,
}: UsernameProps) {
  return (
    <View>
      <Animated.View
        style={{
          minHeight: inputAreaHeight,
          transform: [{ translateY: inputTranslateY }],
        }}
      >
        <CustomInput
          value={username}
          onChangeText={setUsername}
          label="닉네임"
        />
      </Animated.View>

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
