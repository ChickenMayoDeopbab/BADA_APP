import { createCustomScenario } from "@/api/trainApi";
import AnimatedCheck from "@/components/common/AnimatedCheck";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import CustomButton from "@/components/common/CustomButton";
import Loading from "@/components/common/Loading";
import Top from "@/components/common/Top";
import CategorySelect from "@/components/train/CategorySelect";
import StepProgress from "@/components/train/StepProgress";
import { CustomScenarioCategory } from "@/constants/train";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import AnxiousFace from "@/assets/anxiousFace.svg";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type CreateStep = "info" | "detail" | "loading" | "done" | "fail";

/** 입력을 받는 단계만 상단 진행 막대에 표시한다 */
const INPUT_STEPS: CreateStep[] = ["info", "detail"];

type CustomScenarioForm = {
  title: string;
  category: CustomScenarioCategory | null;
  callee: string;
  purpose: string;
};

const EMPTY_FORM: CustomScenarioForm = {
  title: "",
  category: null,
  callee: "",
  purpose: "",
};

const FieldBox = ({ label, children }: { label: string; children: ReactNode }) => (
  <View className="gap-y-2">
    <Text className="text-label font-medium text-label-neutral">{label}</Text>
    {children}
  </View>
);

export default function Create() {
  const [step, setStep] = useState<CreateStep>("info");
  const [form, setForm] = useState<CustomScenarioForm>(EMPTY_FORM);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isExitDialogVisible, setIsExitDialogVisible] = useState(false);
  const isKeyboardVisible = useKeyboardVisible();
  const createdScenarioIdRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      setStep("info");
      setForm(EMPTY_FORM);
      setIsCategoryOpen(false);
      setIsExitDialogVisible(false);
      createdScenarioIdRef.current = null;
    }, [])
  );

  const goToList = useCallback(() => router.replace("/(tabs)/(train)/list"), []);

  /** 뒤로 가기: 두 번째 단계면 첫 단계로, 첫 단계면 나가기 확인 */
  const handleBack = useCallback(() => {
    if (step === "detail") {
      setStep("info");
      return;
    }
    setIsExitDialogVisible(true);
  }, [step]);

  useAndroidBackHandler(() => {
    // 입력 단계가 아니면 되돌릴 내용이 없으므로 바로 목록으로 보낸다
    if (step === "info" || step === "detail") handleBack();
    else goToList();
    return true;
  });

  const isInfoSubmittable =
    form.title.trim().length > 0 && form.category !== null;
  const isDetailSubmittable =
    form.callee.trim().length > 0 && form.purpose.trim().length > 0;

  useEffect(() => {
    if (step !== "loading") return;

    let cancelled = false;

    const run = async () => {
      try {
        // category는 AI 서버 요청 스펙에 없어 화면 상태로만 유지한다
        const result = await createCustomScenario({
          title: form.title,
          call_target: form.callee,
          call_purpose: form.purpose,
        });
        if (cancelled) return;
        createdScenarioIdRef.current = result.scenario.scenario_id;
        // 목록 캐시를 비워야 방금 만든 시나리오가 커스텀 탭에 바로 보인다
        queryClient.invalidateQueries({ queryKey: ["scenarios"] });
        setStep("done");
      } catch {
        if (cancelled) return;
        setStep("fail");
      }
    };

    run();
    return () => { cancelled = true; };
  }, [queryClient, step, form.title, form.callee, form.purpose]);

  if (step === "fail") {
    return (
      <View className="flex-1 bg-background-normal">
        <Top title="커스텀 시나리오 생성" />
        <View className="flex-1 items-center justify-center px-10">
          <AnxiousFace width={90} height={90} />
          <Text className="mt-8 mb-2 text-title2 font-bold text-label-normal text-center">
            시나리오 생성에 실패했어요.
          </Text>
          <Text className="text-body font-medium text-label-alternative text-center">
            생성 시 입력한 내용을 다시 확인해주세요.
          </Text>
        </View>
        <View className="px-10 pb-10 gap-y-1">
          <CustomButton
            label="다시 시도하기"
            tone="primary"
            onPress={() => setStep("detail")}
          />
          <CustomButton label="홈으로 돌아가기" tone="neutral" onPress={goToList} />
        </View>
      </View>
    );
  }

  if (step === "loading") {
    return (
      <Loading
        status="loading"
        title="커스텀 시나리오 생성"
        loadingText={"나만을 위한 커스텀 시나리오가\n만들어지고 있어요!"}
        loadingSubText="잠시만 기다려 주세요."
      />
    );
  }

  if (step === "done") {
    return (
      <View className="flex-1 bg-background-normal">
        <Top title="커스텀 시나리오 생성" />
        <View className="flex-1 items-center justify-center px-10">
          <AnimatedCheck />
          <Text className="mt-8 mb-2 text-title2 font-bold text-label-normal text-center">
            커스텀 시나리오가 완성됐어요.
          </Text>
          <Text className="text-body font-medium text-label-alternative text-center">
            내가 만든 시나리오로 훈련을 시작해볼까요?
          </Text>
        </View>
        <View className="px-10 pb-10 gap-y-1">
          <CustomButton
            label="훈련 바로 시작하기"
            tone="primary"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/(train)/start",
                params: {
                  id: String(createdScenarioIdRef.current),
                  isCustom: "true",
                },
              })
            }
          />
          <CustomButton label="시나리오 보러가기" tone="neutral" onPress={goToList} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background-normal"
      /* Android는 매니페스트의 adjustResize가 창을 줄여주므로 여기서 또 줄이면 이중 보정된다 */
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Top title="커스텀 시나리오 생성" back onBack={handleBack} />
      <View className="px-[33px]">
        <StepProgress
          total={INPUT_STEPS.length}
          current={INPUT_STEPS.indexOf(step) + 1}
        />
      </View>

      <ScrollView
        className="flex-1 px-[33px]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {step === "info" ? (
          <View className="gap-y-6 mt-8">
            <FieldBox label="시나리오 제목">
              <TextInput
                className="rounded-component bg-fill-normal px-4 py-[14px] text-body font-medium text-label-normal"
                placeholder="시나리오를 나타낼 제목을 입력해주세요."
                placeholderTextColor="#BDBEBE"
                value={form.title}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, title: value }))
                }
                onFocus={() => setIsCategoryOpen(false)}
              />
            </FieldBox>
            <FieldBox label="카테고리">
              <CategorySelect
                value={form.category}
                isOpen={isCategoryOpen}
                onToggle={() => setIsCategoryOpen((prev) => !prev)}
                onSelect={(category) => {
                  setForm((prev) => ({ ...prev, category }));
                  setIsCategoryOpen(false);
                }}
              />
            </FieldBox>
          </View>
        ) : (
          <View className="gap-y-6 mt-8">
            <FieldBox label="전화 상대">
              <TextInput
                className="rounded-component bg-fill-normal px-4 py-[14px] text-body font-medium text-label-normal"
                placeholder="전화 상대에 대해 설명해주세요."
                placeholderTextColor="#BDBEBE"
                value={form.callee}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, callee: value }))
                }
              />
            </FieldBox>
            <FieldBox label="전화 목적">
              <TextInput
                className="rounded-component bg-fill-normal px-4 py-[14px] text-body font-medium text-label-normal"
                placeholder="전화의 목적을 설명해주세요."
                placeholderTextColor="#BDBEBE"
                value={form.purpose}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, purpose: value }))
                }
                multiline
                style={{ minHeight: 168, textAlignVertical: "top" }}
              />
            </FieldBox>
          </View>
        )}
      </ScrollView>

      <View
        className={`px-[33px] pt-4 ${isKeyboardVisible ? "pb-5" : "pb-10"}`}
      >
        {step === "info" ? (
          <CustomButton
            label="다음으로"
            tone="primary"
            disabled={!isInfoSubmittable}
            onPress={() => {
              setIsCategoryOpen(false);
              setStep("detail");
            }}
          />
        ) : (
          <CustomButton
            label="시나리오 생성하기"
            tone="primary"
            disabled={!isDetailSubmittable}
            onPress={() => setStep("loading")}
          />
        )}
      </View>

      <ConfirmDialog
        visible={isExitDialogVisible}
        title="정말 나갈까요?"
        description="작성하시던 커스텀 시나리오는 저장되지 않아요."
        confirmLabel="나가기"
        onCancel={() => setIsExitDialogVisible(false)}
        onConfirm={() => {
          setIsExitDialogVisible(false);
          goToList();
        }}
      />
    </KeyboardAvoidingView>
  );
}
