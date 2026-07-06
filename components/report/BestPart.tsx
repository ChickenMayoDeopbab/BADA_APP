import { formatSecondsToMMSS } from "@/utils/formatTime";
import { useAudioSegment } from "@/hooks/useAudioSegment";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface BestPartProps {
  summary?: string;
  startTime: number;
  endTime: number;
  url: string;
}

export default function BestPart({ summary, startTime, endTime, url }: BestPartProps) {
  const { isPlaying, toggle } = useAudioSegment(url, startTime, endTime);

  return (
    <View className="flex-row items-center justify-between p-3 bg-white h-30 rounded-xl">
      <View className="flex-col ml-[10px]">
        <Text className="text-base font-medium">{summary ?? '좋았던 내용 요약 정리'}</Text>
        <Text className="color-[#BDBEBE] font-medium text-sm">{formatSecondsToMMSS(startTime) ?? '00:00'} ~ {formatSecondsToMMSS(endTime) ?? '00:00'}</Text>
      </View>
      <TouchableOpacity onPress={toggle}>
        {isPlaying
          ? <Ionicons name="pause-circle" size={40} color="#0AE365" />
          : <Ionicons name="play-circle-sharp" size={40} color="#0AE365" />}
      </TouchableOpacity>
    </View>
  )
}