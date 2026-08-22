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
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <View style={styles.bellRow}>
          <Ionicons name="notifications" size={30} color={SEMANTIC_COLORS.line.normal} />
          <View style={styles.alarmDot} />
        </View>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>다시 만나서 반가워요{username ? `, ${username}님!` : "!"}</Text>
          <SmileIllustration width={26} height={26} />
        </View>
        <Text style={styles.headline}>오늘은 어떤 시나리오로 연습할까요?</Text>
        </View>

        <View style={styles.attendanceCard}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>이번 주 훈련</Text>
          <Text style={styles.streak}>{streak}일 연속 훈련</Text>
        </View>
        <View style={styles.weekRow}>
          {week.map((date, index) => {
            const isToday = index === week.length - 1;
            const isAttended = attendedDates.includes(formatDate(date));
            return (
              <View key={formatDate(date)} style={styles.dayColumn}>
                <View style={[styles.dayBox, isAttended && styles.attendedDay]}>
                  <Ionicons name="call" size={23} color={isAttended ? "#FFFFFF" : "#DADADB"} />
                </View>
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                  {isToday ? "오늘" : DAY_LABELS[date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        {isCalendarOpen && (
          <View style={styles.calendar}>
              <Text style={styles.calendarTitle}>{today.getFullYear()}년 {today.getMonth() + 1}월</Text>
              <View style={styles.calendarWeekRow}>
                {DAY_LABELS.map((label) => <Text key={label} style={styles.calendarWeekLabel}>{label}</Text>)}
              </View>
              {calendarWeeks.map((weekDates, weekIndex) => (
                <View key={weekIndex} style={styles.calendarWeekRow}>
                  {weekDates.map((date, dayIndex) => {
                    if (!date) return <View key={`empty-${dayIndex}`} style={styles.calendarDay} />;
                    const dateString = formatDate(date);
                    const isAttended = attendedDates.includes(dateString);
                    const isToday = dateString === formatDate(today);
                    return (
                      <View key={dateString} style={styles.calendarDay}>
                        <View style={[styles.calendarDate, isAttended && styles.attendedDay, isToday && !isAttended && styles.todayDate]}>
                          <Text style={[styles.calendarDateText, isAttended && styles.attendedDateText]}>{date.getDate()}</Text>
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
          style={styles.calendarToggle}
        >
          <Ionicons name={isCalendarOpen ? "chevron-up" : "chevron-down"} size={22} color={SEMANTIC_COLORS.label.alternative} />
        </Pressable>
        </View>

        <View style={styles.quickRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/(train)/list")}
          style={styles.scenarioCard}
        >
            <View style={[styles.cardClip, styles.scenarioContent]}>
              <CardGradient id="scenarioGradient" colors={["#FF8A5A", "#FFB184"]} />
              <Text style={styles.eyebrow}>추천 시나리오</Text>
              <Text style={styles.scenarioTitle}>배준하피자{"\n"}배달 주문하기</Text>
              <View style={styles.trainButton}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.trainButtonText}>훈련 하러가기</Text>
              </View>
              <PizzaIllustration width={105} height={105} style={styles.pizza} />
            </View>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/(train)/warmup")}
          style={styles.warmupCard}
        >
            <View style={[styles.cardClip, styles.warmupContent]}>
              <CardGradient id="warmupGradient" colors={["#6D9FF5", "#9CBBFA"]} />
              <FireIllustration width={52} height={52} />
              <Text numberOfLines={2} adjustsFontSizeToFit style={styles.warmupTitle}>
                통화 전 워밍업{"\n"}시작하기
              </Text>
            </View>
        </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  elevation: 3, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12, shadowRadius: 5.3,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F2F2" },
  content: { paddingBottom: 24, paddingHorizontal: 33 },
  header: { paddingTop: 13 },
  bellRow: { alignItems: "flex-end", height: 38, position: "relative" },
  alarmDot: { backgroundColor: "#FF0000", borderRadius: 4, height: 8, position: "absolute", right: 4, top: 1, width: 8 },
  greetingRow: { alignItems: "center", flexDirection: "row", gap: 2 },
  greeting: { color: SEMANTIC_COLORS.label.normal, fontSize: 16, fontWeight: "500", letterSpacing: -0.32, lineHeight: 21 },
  headline: { color: SEMANTIC_COLORS.label.normal, fontSize: 20, fontWeight: "700", letterSpacing: -0.4, lineHeight: 26, marginTop: 2 },
  attendanceCard: { ...cardShadow, backgroundColor: "#FFFFFF", borderRadius: 12, gap: 16, marginTop: 16, paddingHorizontal: 12, paddingVertical: 16 },
  cardHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { color: SEMANTIC_COLORS.label.normal, fontSize: 16, fontWeight: "700", letterSpacing: -0.32, lineHeight: 21 },
  streak: { color: SEMANTIC_COLORS.label.alternative, fontSize: 12, fontWeight: "500", letterSpacing: -0.24, lineHeight: 16 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayColumn: { alignItems: "center", gap: 2, width: 40 },
  dayBox: { alignItems: "center", backgroundColor: SEMANTIC_COLORS.background.alternative, borderRadius: 8, height: 40, justifyContent: "center", width: 40 },
  attendedDay: { backgroundColor: SEMANTIC_COLORS.primary.normal },
  dayLabel: { color: SEMANTIC_COLORS.label.alternative, fontSize: 12, fontWeight: "500", letterSpacing: -0.24, lineHeight: 16 },
  todayLabel: { color: SEMANTIC_COLORS.label.strong, fontWeight: "700" },
  calendar: { borderTopColor: SEMANTIC_COLORS.line.normal, borderTopWidth: 1, gap: 4, paddingTop: 20 },
  calendarTitle: { color: SEMANTIC_COLORS.label.normal, fontSize: 14, fontWeight: "700", lineHeight: 18, marginBottom: 10, textAlign: "center" },
  calendarWeekRow: { flexDirection: "row" },
  calendarWeekLabel: { color: SEMANTIC_COLORS.label.alternative, flex: 1, fontSize: 12, fontWeight: "500", lineHeight: 16, marginBottom: 2, textAlign: "center" },
  calendarDay: { alignItems: "center", flex: 1, height: 32, justifyContent: "center" },
  calendarDate: { alignItems: "center", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  calendarDateText: { color: SEMANTIC_COLORS.label.normal, fontSize: 12, fontWeight: "500", lineHeight: 16 },
  attendedDateText: { color: "#FFFFFF", fontWeight: "700" },
  todayDate: { borderColor: SEMANTIC_COLORS.primary.normal, borderWidth: 1 },
  calendarToggle: { alignItems: "center", height: 28, justifyContent: "center", marginVertical: -8 },
  quickRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  scenarioCard: { ...cardShadow, borderRadius: 12, height: 148, width: "59%" },
  cardClip: { borderRadius: 12, flex: 1, overflow: "hidden" },
  scenarioContent: { backgroundColor: "#FFB184", paddingHorizontal: 12, paddingVertical: 16 },
  eyebrow: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "500", letterSpacing: -0.24, lineHeight: 16 },
  scenarioTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", letterSpacing: -0.4, lineHeight: 26, marginTop: 4 },
  trainButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(122,122,122,0.12)", borderColor: "rgba(255,255,255,0.29)", borderRadius: 8, borderWidth: 1, bottom: 16, flexDirection: "row", gap: 8, left: 12, paddingHorizontal: 10, paddingVertical: 6, position: "absolute" },
  trainButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500", letterSpacing: -0.28, lineHeight: 18 },
  pizza: { bottom: -6, position: "absolute", right: -24 },
  warmupCard: { ...cardShadow, borderRadius: 12, flex: 1, height: 148 },
  warmupContent: { backgroundColor: "#9CBBFA", justifyContent: "flex-end", paddingHorizontal: 12, paddingVertical: 14 },
  warmupTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: -0.32, lineHeight: 21, marginTop: 8 },
});
