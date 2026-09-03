import { calculateLevel, getQuestion } from "@/api";
import { Question } from "@/api/types";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { getAccessToken } from "@/utils/authTokenStorage";
import { completeRequiredDiagnosis } from "@/utils/diagnosisFlow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const QUESTION_COUNT = 10;

type Status = "loading" | "done" | "error" | null;

interface Token {
  sub: string;
}

export const useDiagnosisQuestion = () => {
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const isProfileRetake = Array.isArray(from)
    ? from[0] === "profile"
    : from === "profile";
  const [nowStep, setNowStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(QUESTION_COUNT).fill(3));
  const [status, setStatus] = useState<Status>(null);
  const [questionsList, setQuestionsList] = useState<Question[]>([]);

  useEffect(() => {
    const getQuestionList = async () => {
      try {
        const data = await getQuestion();
        setQuestionsList(data.data);
      } catch {
        console.log("질문 리스트 가져오기 실패");
      }
    };

    getQuestionList();
  }, []);

  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(() => {
        router.push(isProfileRetake
          ? {
              pathname: "/diagnosis/result",
              params: { from: "profile" },
            }
          : "/diagnosis/result");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isProfileRetake, status]);

  const submitAnswers = useCallback(async () => {
    setStatus("loading");

    const token = await getAccessToken();
    if (!token) {
      setStatus("error");
      return;
    }

    const { sub: userId } = jwtDecode<Token>(token);

    try {
      const data = await calculateLevel({
        userId: Number(userId),
        sessionId: uuidv4(),
        type: "SIGNUP",
        answers,
      });
      await AsyncStorage.setItem("diagnosisResult", JSON.stringify(data.data));
      await completeRequiredDiagnosis();
      setStatus("done");
    } catch {
      console.log("레벨 계산 실패");
      setStatus("error");
    }
  }, [answers]);

  const handleChange = useCallback((value: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[nowStep] = value;
      return next;
    });
  }, [nowStep]);

  const handleNext = useCallback(() => {
    if (nowStep < QUESTION_COUNT - 1) {
      setNowStep((prev) => prev + 1);
      return;
    }

    submitAnswers();
  }, [nowStep, submitAnswers]);

  const handleBack = useCallback(() => {
    if (nowStep > 0) {
      setNowStep((prev) => prev - 1);
      return;
    }

    router.back();
  }, [nowStep]);

  useAndroidBackHandler(() => {
    handleBack();
    return true;
  });

  return {
    nowStep,
    currentAnswer: answers[nowStep],
    currentQuestion: questionsList[nowStep],
    status,
    handleChange,
    handleNext,
    handleBack,
  };
};
