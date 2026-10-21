import { normalizeDiagnosisResult } from "@/utils/diagnosisResult";
import Top from "@/components/common/Top";
import { ActivityIndicator, Pressable, ScrollView, Text, View, TouchableWithoutFeedback } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import CustomButton from "@/components/common/CustomButton";
import { Level } from "@/api/types";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Result() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const isProfileRetake = Array.isArray(from)
    ? from[0] === "profile"
    : from === "profile";

  const handleExit = () => {
    if (isProfileRetake) {
      router.dismissTo("/(tabs)/(profile)/profile");
      return;
    }

    router.replace("/home");
  };

  useAndroidBackHandler(() => {
    handleExit();
    return true;
  });
  const [isShowCard, setIsShowCard] = useState<boolean>(false);
  const [result, setResult] = useState<Level>();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    let isActive = true;
    const getData = async () => {
      try {
        const stored = await AsyncStorage.getItem("diagnosisResult");
        const value = normalizeDiagnosisResult(stored ? JSON.parse(stored) : null);
        if (isActive) setResult(value);
      } catch {
        if (isActive) setHasError(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void getData();
    return () => { isActive = false; };
  }, []);

  if (isLoading || hasError) {
    return (
      <View className="flex-1 bg-background-normal">
        <Top title="자가진단" back onBack={handleExit} />
        <View className="flex-1 items-center justify-center gap-5 px-10">
          {isLoading ? <ActivityIndicator /> : <>
            <Text className="text-body text-label-normal">자가진단 결과를 불러오지 못했어요.</Text>
            <CustomButton label="자가진단 다시 하기" onPress={() => router.replace(isProfileRetake
              ? { pathname: "/diagnosis/question", params: { from: "profile" } }
              : "/diagnosis/question")} tone="primary" />
            <CustomButton label="돌아가기" onPress={handleExit} />
          </>}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <Top
        title="자가진단"
        back={isProfileRetake}
        onBack={handleExit}
      />
      {isShowCard && (
        <TouchableWithoutFeedback onPress={() => setIsShowCard(false)}>
          <View className="absolute inset-0 z-10" />
        </TouchableWithoutFeedback>
      )}
      <View className="flex-col flex-1 px-10" style={{ paddingBottom: insets.bottom + 40 }}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow items-center justify-center py-6"
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-pretendard text-headline1 font-medium text-label-alternative">내 레벨은?</Text>
          <View className="relative mt-3 w-full flex-row items-center justify-center gap-1">
            <Text className="shrink text-center font-pretendard text-display1 font-bold text-label-normal">{result?.levelName}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="레벨 설명 보기"
              onPress={() => setIsShowCard(prev => !prev)}
              className="shrink-0"
              hitSlop={8}
            >
              <Ionicons name="help-circle" size={24} color={SEMANTIC_COLORS.line.normal} />
            </Pressable>
            {isShowCard && 
              <TouchableWithoutFeedback>
                <View className="absolute right-0 top-full z-20 mt-2 min-h-20 w-60 max-w-full rounded-component border border-line-neutral bg-background-normal p-3 shadow-xl">
                  <Text className="text-center font-pretendard text-label font-normal text-label-normal">
                    {result?.levelDescription}
                  </Text>
                </View>
              </TouchableWithoutFeedback>}
          </View>
          <View className="my-10 w-full border border-line-alternative" />
          <Text className="w-full text-center font-pretendard text-label font-normal text-label-normal">
            {result?.summary}
          </Text>
        </ScrollView>
        <CustomButton
          label={
            isProfileRetake
              ? "프로필에서 결과 확인하기"
              : "저장하고 홈으로 가기"
          }
          onPress={handleExit}
          tone="primary"
        />
      </View>
    </View>
  )
}
