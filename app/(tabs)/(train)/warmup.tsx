import AnimatedCheck from "@/components/common/AnimatedCheck";
import CustomButton from "@/components/common/CustomButton";
import Loading from "@/components/common/Loading";
import Top from "@/components/common/Top";
import { createCustomScenario } from "@/api/trainApi";
import { router, useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type WarmupCreateStep = "write" | "loading" | "done" | "fail";

type WarmupForm = {
  purpose: string;
  callee: string;
};

const FieldBox = ({ label, children }: { label: string; children: ReactNode }) => (
  <View className="gap-y-2">
    <Text className="text-sm font-medium text-[#3B3D3E]">{label}</Text>
    <View className="bg-[#F5F5F5] rounded-xl px-4 py-3">{children}</View>
  </View>
);

export default function Warmup() {
  const [step, setStep] = useState<WarmupCreateStep>("write");
  const [form, setForm] = useState<WarmupForm>({ purpose: "", callee: "" });
  const createdScenarioIdRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStep("write");
      setForm({ purpose: "", callee: "" });
      createdScenarioIdRef.current = null;
    }, [])
  );

  const isSubmittable =
    form.purpose.trim().length > 0 && form.callee.trim().length > 0;

  useEffect(() => {
    if (step !== "loading") return;

    let cancelled = false;

    /** 워밍업 시나리오 생성 — 제목은 전화 상대를 기반으로 자동 생성 */
    const run = async () => {
      try {
        const autoTitle = `${form.callee}와의 워밍업`.slice(0, 50);
        const result = await createCustomScenario({
          title: autoTitle,
          call_target: form.callee,
          call_purpose: form.purpose,
          is_warmup: true,
        });
        if (cancelled) return;
        createdScenarioIdRef.current = result.scenario.scenario_id;
        setStep("done");
      } catch {
        if (cancelled) return;
        setStep("fail");
      }
    };

    run();
    return () => { cancelled = true; };
  }, [step]);

  if (step === "fail") {
    return (
      <View className="flex-1 bg-white">
        <Top title="실전 워밍업" />
        <View className="flex-1 items-center justify-center px-10">
          <Image
            source={require("@/assets/sadFace.gif")}
            style={{ width: 90, height: 90 }}
          />
          <Text className="text-2xl font-bold mt-8 mb-2 text-center">
            워밍업 생성에 실패했어요.
          </Text>
          <Text className="text-base font-medium text-[#5C5E5E] text-center">
            다시 시도해 주세요.
          </Text>
        </View>
        <View className="px-10 pb-10 gap-y-3">
          <CustomButton
            label="다시 시도하기"
            backgroundColor="#0AE365"
            color="white"
            onPress={() => setStep("write")}
          />
          <CustomButton
            label="홈으로 돌아가기"
            color="#3B3D3E"
            onPress={() => router.push("/(tabs)/(home)/home")}
          />
        </View>
      </View>
    );
  }

  if (step === "loading") {
    return (
      <Loading
        status="loading"
        title="실전 워밍업"
        loadingText="AI가 워밍업 시나리오를 생성하고 있어요."
        loadingSubText="잠시만 기다려 주세요."
      />
    );
  }

  if (step === "done") {
    return (
      <View className="flex-1 bg-white">
        <Top title="실전 워밍업" />
        <View className="flex-1 items-center justify-center px-10">
          <AnimatedCheck />
          <Text className="text-2xl font-bold mt-8 mb-2 text-center">
            워밍업 준비가 됐어요.
          </Text>
          <Text className="text-base font-medium text-[#5C5E5E] text-center">
            실전 워밍업을 시작해볼까요?
          </Text>
        </View>
        <View className="px-10 pb-10 gap-y-3">
          <CustomButton
            label="워밍업 시작하기"
            backgroundColor="#0AE365"
            color="white"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/(train)/warmup-start",
                params: { id: String(createdScenarioIdRef.current) },
              })
            }
          />
          <CustomButton
            label="홈으로 돌아가기"
            color="#3B3D3E"
            onPress={() => router.push("/(tabs)/(home)/home")}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Top title="실전 워밍업" back={true} onBack={() => router.push("/(tabs)/(home)/home")} />
      <ScrollView
        className="flex-1 px-10"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="gap-y-6 mt-2">
          <FieldBox label="전화 목적">
            <TextInput
              className="text-base text-[#3B3D3E]"
              placeholder="전화의 목적을 설명해주세요."
              placeholderTextColor="#BDBEBE"
              value={form.purpose}
              onChangeText={(v) => setForm((prev) => ({ ...prev, purpose: v }))}
              multiline
              style={{ minHeight: 120, textAlignVertical: "top" }}
            />
          </FieldBox>
          <FieldBox label="전화 상대">
            <TextInput
              className="text-base text-[#3B3D3E]"
              placeholder="전화 상대에 대해 설명해주세요."
              placeholderTextColor="#BDBEBE"
              value={form.callee}
              onChangeText={(v) => setForm((prev) => ({ ...prev, callee: v }))}
            />
          </FieldBox>
        </View>
      </ScrollView>
      <View className="px-10 pb-10 pt-4">
        <CustomButton
          label="다음으로"
          backgroundColor="#0AE365"
          color="white"
          disabled={!isSubmittable}
          onPress={() => setStep("loading")}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
