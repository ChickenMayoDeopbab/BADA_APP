import Top from "@/components/common/Top";
import { Pressable, Text, View, TouchableWithoutFeedback } from "react-native";
import type { TextStyle } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from "react";
import { router } from "expo-router";
import CustomButton from "@/components/common/CustomButton";
import { Level } from "@/api/types";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { FONT_WEIGHT } from "@/design-system/typography";

export default function Result() {
  useAndroidBackHandler(() => {
    router.replace("/auth/login");
    return true;
  });
  const [isShowCard, setIsShowCard] = useState<boolean>(false);
  const [result, setResult] = useState<Level>();

  useEffect(() => {
    const getData = async () => {
      const stored = await AsyncStorage.getItem('diagnosisResult');
      if (stored) {
        setResult(JSON.parse(stored));
      }
    };
    getData();
  }, []);
  
  return (
    <View className="flex-1 bg-background-normal">
      <Top title="자가진단"/>
      {isShowCard && (
        <TouchableWithoutFeedback onPress={() => setIsShowCard(false)}>
          <View className="absolute inset-0 z-10" />
        </TouchableWithoutFeedback>
      )}
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center justify-center flex-1">
          <Text className="text-headline1 text-label-alternative" style={{ fontWeight: FONT_WEIGHT.medium as TextStyle["fontWeight"] }}>내 레벨은?</Text>
          <View className="relative flex-row items-center gap-1 mt-3">
            <Text className="text-display1" style={{ fontWeight: FONT_WEIGHT.bold as TextStyle["fontWeight"] }}>{result?.levelName}</Text>
            <Pressable onPress={() => setIsShowCard(prev => !prev)} className="cursor-pointer">
              <Ionicons name="help-circle" size={24} color={SEMANTIC_COLORS.line.normal} />
            </Pressable>
            {isShowCard && 
              <TouchableWithoutFeedback>
                <View className="absolute right-4 top-8 z-20 min-h-20 w-60 rounded-component border border-line-neutral bg-background-normal p-3 shadow-xl">
                  <View className="flex-row flex-wrap justify-center">
                    {result?.levelDescription?.split(' ').map((word, index) => (
                      <Text key={index} className="text-label" style={{ fontWeight: FONT_WEIGHT.regular as TextStyle["fontWeight"] }}>{word} </Text>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>}
          </View>
          <View className="my-10 w-full border border-line-alternative" />
          <View className="flex-row flex-wrap justify-center">
            {result?.summary.split(' ').map((word, index) => (
              <Text key={index} className="text-label" style={{ fontWeight: FONT_WEIGHT.regular as TextStyle["fontWeight"] }}>{word} </Text>
            ))}
          </View>
        </View>
        <CustomButton label="저장하고 홈으로 가기" onPress={() => router.push("/home")} tone="primary" />
      </View>
    </View>
  )
}
