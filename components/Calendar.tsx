import { checkAttendance, getAttendantDays } from "@/api/AttendanceApi";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';

export default function AttendanceCalendar() {
  const [attendance, setAttendance] = useState<{
    monthKey: string;
    markedDates: string[];
  } | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);

  const getMonthKey = (year: number, month: number) => `${year}-${month}`;

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const currentMonthKey = getMonthKey(currentYear, currentMonth);
  const markedDates = attendance?.monthKey === currentMonthKey
    ? attendance.markedDates
    : [];
  const isAttendanceLoaded = attendance?.monthKey === currentMonthKey;
  const isMarkedToday = markedDates.includes(getToday());

  useEffect(() => {
    let isActive = true;

    const getAttendance = async () => {
      try {
        const data = await getAttendantDays(currentYear, currentMonth);

        if (isActive) {
          setAttendance({
            monthKey: currentMonthKey,
            markedDates: (data.data as unknown as { date: string }[]).map(d => d.date),
          });
        }
      } catch (e) {
        console.log("출석일 가져오기 실패", e);
      }
    };

    getAttendance();

    return () => {
      isActive = false;
    };
  }, [currentYear, currentMonth, currentMonthKey]);

  const handleAttendance = async (): Promise<void> => {
    const today = getToday();
    setAttendance(prev => prev && prev.monthKey === currentMonthKey
      ? { ...prev, markedDates: [...prev.markedDates, today] }
      : prev
    );

    try {
      await checkAttendance();
    } catch {
      console.log("출석 체크 실패");
      setAttendance(prev => prev && prev.monthKey === currentMonthKey
        ? { ...prev, markedDates: prev.markedDates.filter(date => date !== today) }
        : prev
      );
    }
  };

  const renderHeader = (date: globalThis.Date) => {
    const currentYear = new Date().getFullYear();
    const calYear = date.getFullYear();
    const calMonth = date.getMonth() + 1;

    const headerText = currentYear === calYear
      ? `${calMonth}월`
      : `${calYear}년 ${calMonth}월`;

    return (
      <Text className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{headerText}</Text>
    );
  };

  const renderDay = ({ date, state }: { date?: DateData; state?: string }) => {
    if (!date) return null;
  
    const dayOfWeek = new Date(date.dateString + 'T00:00:00').getDay(); 
    const isToday = date.dateString === getToday();
  
    let textColor = '#1a1a1a';
    if (dayOfWeek === 0) textColor = '#E24B4A';
    if (dayOfWeek === 6) textColor = '#378ADD';
  
    const isAttended = markedDates.includes(date.dateString);
  
    return (
      <View
        key={`${date.dateString}-${isAttended}`}  
        style={{
          width: 33,
          height: 33,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backgroundColor: isAttended ? '#0AE365' : isToday ? '#E8F4FD' : 'transparent',
        }}>
        <Text style={{
          fontSize: 16,
          color: isAttended ? '#ffffff' : state === 'disabled' ? '#ccc' : textColor,
        }}>
          {date.day}
        </Text>
      </View>
    );
  };

  return (
    <>
      <View className="w-full overflow-hidden bg-white rounded shadow-lg aspect-square">
        <Calendar
          hideDayNames={true}
          renderHeader={renderHeader}
          dayComponent={renderDay}
          theme={{
            arrowColor: '#006FCC',
          }}
          onMonthChange={(month) => {
            setCurrentYear(month.year);
            setCurrentMonth(month.month);
          }}
        />
      </View>
      {isAttendanceLoaded && !isMarkedToday && new Date().getFullYear() === currentYear && new Date().getMonth() + 1 === currentMonth &&
        <TouchableOpacity
          className="flex-row items-center justify-center w-full p-4 mt-2 rounded-lg"
          style={{ backgroundColor: '#0AE365' }}
          onPress={handleAttendance}
        >
          <Text className="font-bold text-white">출석하기</Text>
        </TouchableOpacity>
      }
    </>
  );
}
