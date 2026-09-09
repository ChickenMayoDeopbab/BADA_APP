import { Ionicons } from "@expo/vector-icons";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { format } from "date-fns";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales.kr = {
  monthNames: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  monthNamesShort: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  dayNames: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};

type Props = {
  visible: boolean;
  selectedDate: string | null;
  availableDates: ReadonlySet<string>;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
};

const today = format(new Date(), "yyyy-MM-dd");

export default function TrainingRecordCalendarModal({
  visible,
  selectedDate,
  availableDates,
  isLoading,
  onClose,
  onSelect,
}: Props) {
  const renderHeader = (date: Date) => {
    const currentYear = new Date().getFullYear();
    const label =
      date.getFullYear() === currentYear
        ? `${date.getMonth() + 1}월`
        : `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

    return (
      <Text className="font-bold text-headline2 text-label-normal">
        {label}
      </Text>
    );
  };

  const renderDay = ({ date, state }: { date?: DateData; state?: string }) => {
    if (!date) return null;

    const isAvailable = availableDates.has(date.dateString);
    const isSelected = selectedDate === date.dateString;
    const isOutsideMonth = state === "disabled";
    const dayOfWeek = new Date(`${date.dateString}T00:00:00`).getDay();
    const isDisabled = isLoading || !isAvailable || isOutsideMonth;

    let color = SEMANTIC_COLORS.label.neutral;
    if (dayOfWeek === 0) color = PALETTE.red[40];
    if (dayOfWeek === 6) color = PALETTE.blue[40];
    if (isDisabled) color = PALETTE.neutral[80];
    if (isSelected) color = PALETTE.common[0];

    return (
      <TouchableOpacity
        disabled={isDisabled}
        activeOpacity={0.75}
        onPress={() => onSelect(date.dateString)}
        className="items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isSelected
            ? SEMANTIC_COLORS.primary.normal
            : "transparent",
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: isAvailable ? "600" : "400", color }}>
          {date.day}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="items-center justify-center flex-1 px-6"
        style={{ backgroundColor: `${PALETTE.common[100]}66` }}
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-[380px] overflow-hidden bg-background-normal rounded-dialog"
          style={{ height: 470, padding: 18 }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-center justify-between px-2 mb-1">
            <View>
              <Text className="font-bold text-headline1 text-label-neutral">
                훈련 날짜 선택
              </Text>
              <Text className="mt-1 text-caption text-label-alternative">
                기록이 있는 날짜만 선택할 수 있어요
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="items-center justify-center w-9 h-9 rounded-full bg-fill-neutral"
            >
              <Ionicons
                name="close"
                size={20}
                color={SEMANTIC_COLORS.label.alternative}
              />
            </TouchableOpacity>
          </View>

          <Calendar
            current={selectedDate ?? today}
            maxDate={today}
            hideExtraDays
            renderHeader={renderHeader}
            dayComponent={renderDay}
            enableSwipeMonths
            style={{ height: 370 }}
            theme={{
              calendarBackground: SEMANTIC_COLORS.background.normal,
              arrowColor: PALETTE.blue[40],
              textDayHeaderFontSize: 13,
              textDayHeaderFontWeight: "600",
              textSectionTitleColor: SEMANTIC_COLORS.label.alternative,
              monthTextColor: SEMANTIC_COLORS.label.normal,
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
