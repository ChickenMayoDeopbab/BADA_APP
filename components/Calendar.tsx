import { useState } from "react";
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
  const [markedDates, setMarkedDates] = useState<Record<string, object>>({}); // 출석체크된 날짜

  const getToday = () => new Date().toISOString().split('T')[0];
  const isMarkedToday = !!markedDates[getToday()];

  // 출석 체크 버튼 클릭
  const handleAttendance = () => {
    const today = getToday();
    setMarkedDates(prev => ({
      ...prev,
      [today] : {
        selected: true,
        selectedColor: '#0AE365',
        selectedTextColor: '#ffffff',
      }
    }))
  }

  // 헤더 커스텀
  const renderHeader = (date: Date) => {
    const currentYear = new Date().getFullYear();
    const calYear = date.getFullYear();
    const calMonth = date.getMonth() + 1;
    
    const headerText = currentYear === calYear 
      ? `${calMonth}월`
      : `${calYear}년 ${calMonth}월`;

    return (
      <Text className="text-lg font-bold" style={{color: '#1a1a1a'}}>{headerText}</Text>
    )
  }

  // 날짜칸 커스텀
  const renderDay = ({ date, state }: { date?: DateData, state?: string}) => {
    if (!date) return null;
    
    const dayOfWeek = new Date(date.dateString).getDay();
    const isToday = date.dateString === getToday(); 
  
    let textColor = '#1a1a1a';
    if (dayOfWeek === 0) textColor = '#E24B4A';
    if (dayOfWeek === 6) textColor = '#378ADD';
  
    const isAttended = markedDates[date.dateString];
  
    return (
      <View style={{
        width: 33,
        height: 33,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: isAttended ? '#0AE365' : isToday ? '#E8F4FD' : 'transparent', // 수정
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
              markedDates={markedDates}
              renderHeader={renderHeader}
              dayComponent={renderDay}
              theme={{
                arrowColor: '#006FCC',
              }}
        />
      </View>
      {!isMarkedToday && 
        <TouchableOpacity className="flex-row items-center justify-center w-full p-4 mt-2 rounded-lg" style={{backgroundColor: '#0AE365'}} onPress={handleAttendance}><Text className="font-bold text-white">출석하기</Text></TouchableOpacity>
      }
    </>
  )
}