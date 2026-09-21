import { Text, View } from "react-native";
import AudioSegmentButton from "../audio/AudioSegmentButton";

interface BestPartProps {
  summary: string;
  startTime: number;
  endTime: number;
  url: string;
}

const formatTime = (seconds: number): string => {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function BestPart({
  summary,
  startTime,
  endTime,
  url,
}: BestPartProps) {
  return (
    <View className="flex-row items-center justify-between p-3 bg-background-normal rounded-component">
      <View className="flex-1 ml-[10px] mr-3">
        <Text className="text-body font-medium text-label-neutral" numberOfLines={2}>
          {summary}
        </Text>
        <Text className="text-line-normal font-medium text-label mt-1">
          {formatTime(startTime)} ~ {formatTime(endTime)}
        </Text>
      </View>
      <AudioSegmentButton
        audioUrl={url}
        startTime={startTime}
        endTime={endTime}
      />
    </View>
  );
}
