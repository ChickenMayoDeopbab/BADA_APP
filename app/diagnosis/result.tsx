import Top from "@/components/common/Top";
import { Pressable, Text, View, TouchableWithoutFeedback } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from "react";
import { router } from "expo-router";
import CustomButton from "@/components/common/CustomButton";
import { Level } from "@/api/types";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Result() {
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
    <View className="flex-1 bg-white">
      <Top title="자가진단"/>
      {isShowCard && (
        <TouchableWithoutFeedback onPress={() => setIsShowCard(false)}>
          <View className="absolute inset-0 z-10" />
        </TouchableWithoutFeedback>
      )}
      <View className="flex-col flex-1 px-10 mb-10">
        <View className="flex-col items-center justify-center flex-1">
          <Text className="color-[#5C5E5E] font-medium text-xl">내 레벨은?</Text>
          <View className="relative flex-row items-center gap-1 mt-3">
            <Text className="text-4xl font-bold">{result?.levelName}</Text>
            <Pressable onPress={() => setIsShowCard(prev => !prev)} className="cursor-pointer">
              <Ionicons name="help-circle" size={24} color="#BDBEBE" />
            </Pressable>
            {isShowCard && 
              <TouchableWithoutFeedback>
                <View className="absolute z-20 p-3 bg-white border rounded shadow-xl border-[#DADADB] min-h-20 w-60 top-8 right-4">
                  <View className="flex-row flex-wrap justify-center">
                    {result?.levelDescription?.split(' ').map((word, index) => (
                      <Text key={index}>{word} </Text>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>}
          </View>
          <View className="my-10 border border-[#EAEAEA] w-full" />
          <View className="flex-row flex-wrap justify-center">
            {result?.summary.split(' ').map((word, index) => (
              <Text key={index}>{word} </Text>
            ))}
          </View>
        </View>
        <CustomButton label="저장하고 홈으로 가기" onPress={() => router.push("/home")} backgroundColor="#0AE365" color="white"/>
      </View>
    </View>
  )
}