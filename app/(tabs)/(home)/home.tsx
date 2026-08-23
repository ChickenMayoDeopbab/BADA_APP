import { checkAttendance, getAttendantDays } from "@/api/AttendanceApi";
import { getMyPage } from "@/api/userInfoApi";
import FireIllustration from "@/assets/home-fire.svg";
import PizzaIllustration from "@/assets/home-pizza.svg";
import SmileIllustration from "@/assets/home-smile.svg";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function CardGradient({ id, colors }: { id: string; colors: [string, string] }) {
  return (
    <Svg
      width={400}
      height={148}
      viewBox="0 0 400 148"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient
          id={id}
          x1={0}
          y1={148}
          x2={220}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect width={400} height={148} fill={`url(#${id})`} />
    </Svg>
  );
}

export default function Home() {
  useDoubleBackExit();
  const [username, setUsername] = useState("");
  const [attendedDates, setAttendedDates] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    return date;
  }), [today]);
  const calendarWeeks = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: lastDate }, (_, index) => new Date(year, month, index + 1)),
    ];

    while (cells.length % 7 !== 0) cells.push(null);

    return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  }, [today]);

  useEffect(() => {
    let isActive = true;
    const loadHome = async () => {
      try { await checkAttendance(); } catch {}
      const results = await Promise.allSettled([
        getAttendantDays(today.getFullYear(), today.getMonth() + 1),
        getMyPage(),
      ]);
      if (!isActive) return;
      if (results[0].status === "fulfilled") {
        const dates = (results[0].value.data as unknown as { date: string }[]).map(({ date }) => date);
        setAttendedDates(dates);
      }
      if (results[1].status === "fulfilled") setUsername(results[1].value.data.username);
    };
    loadHome();
    return () => { isActive = false; };
  }, [today]);

  const streak = useMemo(() => {
    const attended = new Set(attendedDates);
    const cursor = new Date(today);
    let count = 0;
    while (attended.has(formatDate(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [attendedDates, today]);

  return (
    <SafeAreaView className="flex-1 bg-[#F2F2F2]" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-[33px] pb-6">
        <View className="pt-[13px]">
        <View className="relative h-[38px] items-end">
          <Ionicons name="notifications" size={30} color={SEMANTIC_COLORS.line.normal} />
          <View className="absolute right-1 top-px size-2 rounded-full bg-[#FF0000]" />
        </View>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-body font-medium text-label-normal">다시 만나서 반가워요{username ? `, ${username}님!` : "!"}</Text>
          <SmileIllustration width={26} height={26} />
        </View>
        <Text className="mt-0.5 text-headline1 font-bold text-label-normal">오늘은 어떤 시나리오로 연습할까요?</Text>
        </View>

        <View className="mt-4 gap-4 rounded-component bg-white px-3 py-4 shadow-md">
        <View className="flex-row items-center justify-between">
          <Text className="text-body font-bold text-label-normal">이번 주 훈련</Text>
          <Text className="text-caption font-medium text-label-alternative">{streak}일 연속 훈련</Text>
        </View>
        <View className="flex-row justify-between">
          {week.map((date, index) => {
            const isToday = index === week.length - 1;
            const isAttended = attendedDates.includes(formatDate(date));
            return (
              <View key={formatDate(date)} className="w-10 items-center gap-0.5">
                <View className={`size-10 items-center justify-center rounded-control ${isAttended ? "bg-primary-normal" : "bg-background-alternative"}`}>
                  <Ionicons name="call" size={23} color={isAttended ? "#FFFFFF" : "#DADADB"} />
                </View>
                <Text className={`text-caption ${isToday ? "font-bold text-label-strong" : "font-medium text-label-alternative"}`}>
                  {isToday ? "오늘" : DAY_LABELS[date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        {isCalendarOpen && (
          <View className="gap-1 border-t border-line-normal pt-5">
              <Text className="mb-2.5 text-center text-label font-bold text-label-normal">{today.getFullYear()}년 {today.getMonth() + 1}월</Text>
              <View className="flex-row">
                {DAY_LABELS.map((label) => <Text key={label} className="mb-0.5 flex-1 text-center text-caption font-medium text-label-alternative">{label}</Text>)}
              </View>
              {calendarWeeks.map((weekDates, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {weekDates.map((date, dayIndex) => {
                    if (!date) return <View key={`empty-${dayIndex}`} className="h-8 flex-1" />;
                    const dateString = formatDate(date);
                    const isAttended = attendedDates.includes(dateString);
                    const isToday = dateString === formatDate(today);
                    return (
                      <View key={dateString} className="h-8 flex-1 items-center justify-center">
                        <View className={`size-7 items-center justify-center rounded-full ${isAttended ? "bg-primary-normal" : isToday ? "border border-primary-normal" : ""}`}>
                          <Text className={`text-caption ${isAttended ? "font-bold text-white" : "font-medium text-label-normal"}`}>{date.getDate()}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
          </View>
        )}

        <Pressable
          accessibilityLabel={isCalendarOpen ? "월간 출석 내역 접기" : "월간 출석 내역 펼치기"}
          hitSlop={10}
          onPress={() => setIsCalendarOpen((previous) => !previous)}
          className="-my-2 h-7 items-center justify-center"
        >
          <Ionicons name={isCalendarOpen ? "chevron-up" : "chevron-down"} size={22} color={SEMANTIC_COLORS.label.alternative} />
        </Pressable>
        </View>

        <View className="mt-3 flex-row gap-3">
        <Pressable
          onPress={() => router.push("/(tabs)/(train)/list")}
          className="h-[148px] w-[59%] rounded-component shadow-md"
        >
            <View className="flex-1 overflow-hidden rounded-component bg-[#FFB184] px-3 py-4">
              <CardGradient id="scenarioGradient" colors={["#FF8A5A", "#FFB184"]} />
              <Text className="text-caption font-medium text-white/80">추천 시나리오</Text>
              <Text className="mt-1 text-headline1 font-bold text-white">배준하피자{"\n"}배달 주문하기</Text>
              <View className="absolute bottom-4 left-3 flex-row items-center gap-2 rounded-control border border-white/30 bg-black/10 px-2.5 py-1.5">
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text className="text-label font-medium text-white">훈련 하러가기</Text>
              </View>
              <View className="absolute -bottom-1.5 -right-6">
                <PizzaIllustration width={105} height={105} />
              </View>
            </View>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/(train)/warmup")}
          className="h-[148px] flex-1 rounded-component shadow-md"
        >
            <View className="flex-1 justify-end overflow-hidden rounded-component bg-[#9CBBFA] px-3 py-3.5">
              <CardGradient id="warmupGradient" colors={["#6D9FF5", "#9CBBFA"]} />
              <FireIllustration width={52} height={52} />
              <Text numberOfLines={2} adjustsFontSizeToFit className="mt-2 text-body font-bold text-white">
                통화 전 워밍업{"\n"}시작하기
              </Text>
            </View>
        </Pressable>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
