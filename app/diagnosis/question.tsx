import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { TextStyle } from "react-native";
import Loading from "@/components/common/Loading";
import { calculateLevel, getQuestion } from "@/api";
import { Question as QuestionType } from "@/api/types";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getAccessToken } from "@/utils/authTokenStorage";
import { completeRequiredDiagnosis } from "@/utils/diagnosisFlow";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { FONT_WEIGHT } from "@/design-system/typography";

type RadioSize = 'sm' | 'lg';
type RadioOption = {
  value: number;
  size?: RadioSize;
}
type RadioProps = {
  options: RadioOption[];
  value: number;
  onChange: (value: number) => void;
}

const CheckBtns = ({ options, value, onChange }: RadioProps) => {
  return (
    <>
      <View className="flex-row items-center justify-between px-2">
        {options.map((option) => {
          const isActive = value === option.value;
          const outerSize = option.size === 'lg' ? 50 : 40;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              className="items-center gap-1.5"
            >
              <View
                className="rounded-pill"
                style={{
                  width: outerSize,
                  height: outerSize,
                  borderWidth: 5,
                  borderColor: isActive ? SEMANTIC_COLORS.primary.normal : SEMANTIC_COLORS.line.neutral,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View className="flex-row items-center justify-between px-2.5 mt-2">
        <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>전혀 없다</Text>
        <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>보통이다</Text>
        <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>자주 있다</Text>
      </View>
    </>
  );
};

type Status = "loading" | "done" | "error" | null;

interface Token {
  sub: string;
}

export default function Question() {
  const [nowStep, setNowStep] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(3));
  const [status, setStatus] = useState<Status>(null);
  const [questionsList, setQusetionList] = useState<QuestionType[]>([]);

  useEffect(() => {
    const getQuestionList = async () => {
      try {
        const data = await getQuestion();
        setQusetionList(data.data);
      } catch {
        console.log("질문 리스트 가져오기 실패");
      }
    };

    getQuestionList();
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      submitAnswers(answers);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'done') {
      const timer = setTimeout(() => {
        router.push('/diagnosis/result');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const submitAnswers = async (answers: number[]) => {
    const token = await getAccessToken();
    if (!token) {
      setStatus('error')
      return;
    }
    const { sub: userId } = jwtDecode<Token>(token);

    const id = uuidv4();

    try {
      const data = await calculateLevel({
        userId: Number(userId),
        sessionId: id,
        type: "SIGNUP",
        answers: answers,
      });
      await AsyncStorage.setItem('diagnosisResult', JSON.stringify(data.data));
      await completeRequiredDiagnosis();
      setStatus('done');
    } catch (e) {
      console.log('레벨 계산 실패');
      setStatus('error');
    }
  };

  const handleChange = (value: number) => {
    setAnswers(prev => {
      const next = [...prev];
      next[nowStep] = value;
      return next;
    });
  };

  const handleNext = () => {
    if (nowStep < 9) {
      setNowStep(prev => prev + 1);
    } else {
      setStatus('loading');
    }
  };

  const handleBack = () => {
    if (nowStep > 0) {
      setNowStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  useAndroidBackHandler(() => {
    handleBack();
    return true;
  });

  const PercentBar = ({ step }: { step: number }) => {
    const percent = (step / 10) * 100;
    return (
      <View className="h-[18px] w-full overflow-hidden rounded-pill bg-fill-neutral">
        <View className="h-full rounded-pill bg-primary-normal" style={{ width: `${percent}%` }} />
      </View>
    );
  };

  if (status !== null) {
    return (
      <Loading
        status={status}
        title="자가진단"
        loadingText="콜포비아 레벨을 계산 중이에요."
        loadingSubText="잠시만 기다려 주세요."
        doneText="콜포비아 레벨의 계산이 끝났어요."
        doneSubText="함께 결과를 확인해볼까요?"
        errorText="레벨 계산에 실패했어요."
        errorSubText="다시 시도해주세요."
      />
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <Top back={true} title="자가진단" onBack={handleBack} />
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center w-full gap-3">
          <View className="flex-row justify-between w-full">
            <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>콜포비아 자가진단</Text>
            <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>{nowStep + 1}/10</Text>
          </View>
          <PercentBar step={nowStep + 1} />
          <Text className="text-label text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>콜포비아는 누구나 겪을 수 있는 자연스러운 증상이에요.</Text>
        </View>
        <View className="flex-col items-center justify-center flex-1 gap-6">
          <View className="flex-row flex-wrap justify-center">
            {questionsList[nowStep]?.content.split(' ').map((word, index) => (
              <Text key={index} className="text-center text-headline1" style={{ fontWeight: FONT_WEIGHT.bold as TextStyle["fontWeight"] }}>{word} </Text>
            ))}
          </View>
        </View>
        <CheckBtns
          options={[
            { value: 1, size: 'lg' },
            { value: 2, size: 'sm' },
            { value: 3, size: 'sm' },
            { value: 4, size: 'sm' },
            { value: 5, size: 'lg' },
          ]}
          value={answers[nowStep]}
          onChange={handleChange}
        />
        <View className="my-10 border border-line-alternative" />
        <CustomButton label="다음 문항" onPress={handleNext} tone="primary" />
      </View>
    </View>
  );
}
