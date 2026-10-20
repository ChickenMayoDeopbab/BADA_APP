import { calculateLevel, getQuestion } from "@/api";
import { createDiagnosisSubmitRequest } from "@/api/requestBuilders";
import { Question } from "@/api/types";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { getAccessToken } from "@/utils/authTokenStorage";
import { completeRequiredDiagnosis } from "@/utils/diagnosisFlow";
import { normalizeDiagnosisResult } from "@/utils/diagnosisResult";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const QUESTION_COUNT = 10;

type Status = "loading" | "done" | "error" | null;

export const useDiagnosisQuestion = () => {
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const isProfileRetake = Array.isArray(from)
    ? from[0] === "profile"
    : from === "profile";
  const [nowStep, setNowStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(QUESTION_COUNT).fill(3));
  const [status, setStatus] = useState<Status>(null);
  const [questionsList, setQuestionsList] = useState<Question[]>([]);

  const [questionStatus, setQuestionStatus] = useState<"loading" | "done" | "error">("loading");
  const isActiveRef = useRef(false);
  const isLoadingQuestionsRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  /** Failed question loads stay recoverable without exposing blank questions. */
  const loadQuestions = useCallback(async () => {
    if (isLoadingQuestionsRef.current) return;
    isLoadingQuestionsRef.current = true;
    setQuestionStatus("loading");
    try {
      const { data } = await getQuestion();
      if (!isActiveRef.current) return;
      if (!Array.isArray(data) || data.length !== QUESTION_COUNT
        || data.some((question) => typeof question?.content !== "string" || !question.content.trim())) {
        throw new Error("자가진단 문항을 확인할 수 없습니다.");
      }
      setQuestionsList(data);
      setQuestionStatus("done");
    } catch {
      if (isActiveRef.current) setQuestionStatus("error");
    } finally {
      isLoadingQuestionsRef.current = false;
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    void loadQuestions();
    return () => { isActiveRef.current = false; };
  }, [loadQuestions]);

  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(() => {
        router.replace(isProfileRetake
          ? {
              pathname: "/diagnosis/result",
              params: { from: "profile" },
            }
          : "/diagnosis/result");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isProfileRetake, status]);

  /** Serialize submissions and reuse the same identifier when retrying unchanged answers. */
  const submitAnswers = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setStatus("loading");
    try {
      const token = await getAccessToken();
      if (!isActiveRef.current) return;
      if (!token) throw new Error("로그인이 필요합니다.");
      submissionIdRef.current ??= uuidv4();
      const request = createDiagnosisSubmitRequest(submissionIdRef.current, "SIGNUP", answers);
      const { data } = await calculateLevel(request);
      if (!isActiveRef.current) return;
      const result = normalizeDiagnosisResult(data);
      await AsyncStorage.setItem("diagnosisResult", JSON.stringify(result));
      if (!isActiveRef.current) return;
      await completeRequiredDiagnosis();
      if (isActiveRef.current) setStatus("done");
    } catch {
      if (isActiveRef.current) setStatus("error");
    } finally {
      isSubmittingRef.current = false;
    }
  }, [answers]);

  /** Retry the failed stage while preserving already selected answers. */
  const handleRetry = useCallback(async () => {
    if (questionStatus === "error") await loadQuestions();
    else if (status === "error") await submitAnswers();
  }, [loadQuestions, questionStatus, status, submitAnswers]);

  const handleChange = useCallback((value: number) => {
    if (status !== null || questionStatus !== "done" || value < 1 || value > 5) return;
    submissionIdRef.current = null;
    setAnswers((prev) => {
      const next = [...prev];
      next[nowStep] = value;
      return next;
    });
  }, [nowStep, questionStatus, status]);

  const handleNext = useCallback(() => {
    if (questionStatus !== "done" || status !== null) return;
    if (nowStep < QUESTION_COUNT - 1) {
      setNowStep(nowStep + 1);
      return;
    }

    submitAnswers();
  }, [nowStep, questionStatus, status, submitAnswers]);

  const handleBack = useCallback(() => {
    if (status === "loading" || status === "done") return;
    if (status === "error") {
      setStatus(null);
      return;
    }
    if (nowStep > 0) {
      setNowStep(nowStep - 1);
      return;
    }

    router.back();
  }, [nowStep, status]);

  useAndroidBackHandler(() => {
    handleBack();
    return true;
  });

  return {
    nowStep,
    currentAnswer: answers[nowStep],
    currentQuestion: questionsList[nowStep],
    status: questionStatus === "done" ? status : questionStatus,
    isLoadingQuestions: questionStatus !== "done",
    handleRetry,
    handleChange,
    handleNext,
    handleBack,
  };
};
