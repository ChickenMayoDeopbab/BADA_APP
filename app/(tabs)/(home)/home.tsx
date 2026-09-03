import { getAttendantDays } from "@/api/AttendanceApi";
import { getMyPage } from "@/api/userInfoApi";
import FireIllustration from "@/assets/home-fire.svg";
import PizzaIllustration from "@/assets/home-pizza.svg";
import SmileIllustration from "@/assets/home-smile.svg";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";
import { useNotifications } from "@/hooks/useNotifications";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Href, router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const calendarLayoutTransition = LinearTransition.duration(220).easing(
  Easing.inOut(Easing.quad),
);

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
  const notificationsQuery = useNotifications("ALL");
  const [name, setName] = useState("");
  const [attendedDates, setAttendedDates] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    return date;
  }), [today]);
  const calendarWeeks = useMemo(() => {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: lastDate }, (_, index) => new Date(year, month, index + 1)),
    ];

    while (cells.length % 7 !== 0) cells.push(null);

    return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  }, [displayedMonth]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadHome = async () => {
        const attendanceMonths = week.reduce<{ year: number; month: number }[]>((months, date) => {
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const isIncluded = months.some((item) => item.year === year && item.month === month);

          if (!isIncluded) months.push({ year, month });
          return months;
        }, []);
        const displayedYear = displayedMonth.getFullYear();
        const displayedMonthNumber = displayedMonth.getMonth() + 1;
        const includesDisplayedMonth = attendanceMonths.some(
          (item) => item.year === displayedYear && item.month === displayedMonthNumber,
        );
        if (!includesDisplayedMonth) {
          attendanceMonths.push({ year: displayedYear, month: displayedMonthNumber });
        }
        const [attendanceResults, myPageResult] = await Promise.all([
          Promise.allSettled(attendanceMonths.map(({ year, month }) => getAttendantDays(year, month))),
          getMyPage().then(
            (value) => ({ status: "fulfilled" as const, value }),
            () => ({ status: "rejected" as const }),
          ),
        ]);
        if (!isActive) return;
        const dates = attendanceResults.flatMap((result) => {
          if (result.status === "rejected") return [];
          return (result.value.data as unknown as { date: string }[]).map(({ date }) => date);
        });
        if (attendanceResults.some((result) => result.status === "fulfilled")) {
          setAttendedDates([...new Set(dates)]);
        }
        if (myPageResult.status === "fulfilled") setName(myPageResult.value.data.name ?? "");
      };
      loadHome();
      return () => { isActive = false; };
    }, [displayedMonth, week]),
  );

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
  const unreadNotificationCount =
    notificationsQuery.data?.pages[0]?.unreadCount ?? 0;
  const isCurrentMonth =
    displayedMonth.getFullYear() === today.getFullYear() &&
    displayedMonth.getMonth() === today.getMonth();

  const moveMonth = (offset: number) => {
    setDisplayedMonth((current) => (
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    ));
  };

  return (
    <SafeAreaView className="flex-1 bg-background-alternative" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-8 pb-6">
        <View className="pt-[13px]">
        <Pressable
          accessibilityLabel="알림 보기"
          hitSlop={8}
          onPress={() => router.push("/(tabs)/(home)/notifications" as Href)}
          className="relative h-[38px] items-end"
        >
          <Ionicons name="notifications" size={30} color={SEMANTIC_COLORS.line.normal} />
          {unreadNotificationCount > 0 && (
            <View className="absolute right-1 top-px size-2 rounded-full bg-status-error" />
          )}
        </Pressable>
        <View className="flex-row items-center gap-0.5">
          <Text className="font-medium text-body text-label-normal">다시 만나서 반가워요{name ? `, ${name}님!` : "!"}</Text>
          <SmileIllustration width={26} height={26} />
        </View>
        <Text className="mt-0.5 text-headline1 font-bold text-label-normal">오늘은 어떤 시나리오로 연습할까요?</Text>
        </View>

        <Animated.View
          layout={calendarLayoutTransition}
          className="gap-4 px-3 py-4 mt-4 bg-white shadow-md rounded-component"
        >
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-body text-label-normal">이번 주 훈련</Text>
          <Text className="font-medium text-caption text-label-alternative">{streak}일 연속 훈련</Text>
        </View>
        <View className="flex-row justify-between">
          {week.map((date, index) => {
            const isToday = index === week.length - 1;
            const isAttended = attendedDates.includes(formatDate(date));
            return (
              <View key={formatDate(date)} className="w-10 items-center gap-0.5">
                <View className={`size-10 items-center justify-center rounded-control ${isAttended ? "bg-primary-normal" : "bg-background-alternative"}`}>
                  <Ionicons
                    name="call"
                    size={23}
                    color={isAttended ? PALETTE.common[0] : SEMANTIC_COLORS.line.neutral}
                  />
                </View>
                <Text className={`text-caption ${isToday ? "font-bold text-label-strong" : "font-medium text-label-alternative"}`}>
                  {isToday ? "오늘" : DAY_LABELS[date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        {isCalendarOpen && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            className="gap-1 pt-5 border-t border-line-normal"
          >
              <View className="flex-row items-center justify-between px-7 mb-3">
                <Pressable accessibilityLabel="이전 달 보기" hitSlop={10} onPress={() => moveMonth(-1)}>
                  <Ionicons name="caret-back" size={18} color={PALETTE.blue[40]} />
                </Pressable>
                <Text className="font-bold text-headline2 text-label-normal">
                  {displayedMonth.getFullYear() === today.getFullYear()
                    ? `${displayedMonth.getMonth() + 1}월`
                    : `${displayedMonth.getFullYear()}년 ${displayedMonth.getMonth() + 1}월`}
                </Text>
                <Pressable
                  accessibilityLabel="다음 달 보기"
                  disabled={isCurrentMonth}
                  hitSlop={10}
                  onPress={() => moveMonth(1)}
                  style={{ opacity: isCurrentMonth ? 0 : 1 }}
                >
                  <Ionicons name="caret-forward" size={18} color={PALETTE.blue[40]} />
                </Pressable>
              </View>
              <View className="flex-row">
                {DAY_LABELS.map((label) => (
                  <Text key={label} className="flex-1 text-center text-[13px] font-semibold text-label-alternative">
                    {label}
                  </Text>
                ))}
              </View>
              {calendarWeeks.map((weekDates, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {weekDates.map((date, dayIndex) => {
                    if (!date) return <View key={`empty-${dayIndex}`} className="flex-1 h-12" />;
                    const dateString = formatDate(date);
                    const isAttended = attendedDates.includes(dateString);
                    return (
                      <View key={dateString} className="items-center justify-center flex-1 h-12">
                        <TouchableOpacity
                          disabled
                          activeOpacity={1}
                          className="items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            overflow: "hidden",
                            backgroundColor: isAttended
                              ? SEMANTIC_COLORS.primary.normal
                              : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: "600",
                              color: isAttended
                                ? PALETTE.common[0]
                                : SEMANTIC_COLORS.label.neutral,
                            }}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
          </Animated.View>
        )}

        <Animated.View layout={calendarLayoutTransition}>
          <Pressable
            accessibilityLabel={isCalendarOpen ? "월간 출석 내역 접기" : "월간 출석 내역 펼치기"}
            hitSlop={10}
            onPress={() => setIsCalendarOpen((previous) => !previous)}
            className="items-center justify-center -my-2 h-7"
          >
            <Ionicons name={isCalendarOpen ? "chevron-up" : "chevron-down"} size={22} color={SEMANTIC_COLORS.label.alternative} />
          </Pressable>
        </Animated.View>
        </Animated.View>

        <Animated.View
          layout={calendarLayoutTransition}
          className="flex-row gap-3 mt-3"
        >
        <Pressable
          onPress={() => router.push("/(tabs)/(train)/list")}
          className="h-[148px] w-[59%] rounded-component shadow-md"
        >
            <View className="flex-1 overflow-hidden rounded-component bg-[#FFB184] px-3 py-4">
              <CardGradient id="scenarioGradient" colors={["#FF8A5A", "#FFB184"]} />
              <Text className="font-medium text-caption text-white/80">추천 시나리오</Text>
              <Text className="mt-1 font-bold text-white text-headline1">배준하피자{"\n"}배달 주문하기</Text>
              <View className="absolute bottom-4 left-3 flex-row items-center gap-2 rounded-control border border-white/30 bg-black/10 px-2.5 py-1.5">
                <Ionicons name="call" size={14} color={PALETTE.common[0]} />
                <Text className="font-medium text-white text-label">훈련 하러가기</Text>
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
              <Text numberOfLines={2} adjustsFontSizeToFit className="mt-2 font-bold text-white text-body">
                통화 전 워밍업{"\n"}시작하기
              </Text>
            </View>
        </Pressable>
        </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
