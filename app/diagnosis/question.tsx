import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { DIAGNOSIS } from "@/constants/diagnosis";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
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

const ACTIVE_COLOR = '#0AE365';
const INACTIVE_COLOR = '#DADADB';

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
                style={{
                  width: outerSize,
                  height: outerSize,
                  borderRadius: outerSize / 2,
                  borderWidth: 5,
                  borderColor: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View className="flex-row items-center justify-between px-2.5 mt-2">
        <Text className="text-sm text-[#5C5E5E] font-medium">전혀 없다</Text>
        <Text className="text-sm text-[#5C5E5E] font-medium">보통이다</Text>
        <Text className="text-sm text-[#5C5E5E] font-medium">자주 있다</Text>
      </View>
    </>
  );
};

type Status = "loading" | "done" | "error" | null;

interface Token {
  sub: string;
}

export default function Question() {
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const isProfileRetake = Array.isArray(from)
    ? from[0] === "profile"
    : from === "profile";
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
        router.replace(
          isProfileRetake
            ? {
                pathname: "/diagnosis/result",
                params: { from: "profile" },
              }
            : "/diagnosis/result",
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isProfileRetake, status]);

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
      <View className="h-[18px] w-full rounded bg-[#EBEBEC] overflow-hidden">
        <View className="h-full rounded bg-[#0AE365]" style={{ width: `${percent}%` }} />
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
    <View className="flex-1 bg-white">
      <Top back={true} title="자가진단" onBack={handleBack} />
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center w-full gap-3">
          <View className="flex-row justify-between w-full">
            <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아 자가진단</Text>
            <Text className="text-sm font-medium text-[#5C5E5E]">{nowStep + 1}/10</Text>
          </View>
          <PercentBar step={nowStep + 1} />
          <Text className="text-sm font-medium text-[#5C5E5E]">콜포비아는 누구나 겪을 수 있는 자연스러운 증상이에요.</Text>
        </View>
        <View className="flex-col items-center justify-center flex-1 gap-6">
          <View className="flex-row flex-wrap justify-center">
            {questionsList[nowStep]?.content.split(' ').map((word, index) => (
              <Text key={index} className="text-2xl font-bold text-center">{word} </Text>
            ))}
          </View>
          <Image source={DIAGNOSIS[nowStep]} resizeMode="contain" className="w-[200px] h-[200px]" />
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
        <View className="my-10 border border-[#EAEAEA]" />
        <CustomButton label="다음 문항" onPress={handleNext} backgroundColor="#0AE365" color="white" />
      </View>
    </View>
  );
}
