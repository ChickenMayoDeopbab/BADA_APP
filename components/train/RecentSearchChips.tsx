import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

interface RecentSearchChipsProps {
  keywords: string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClearAll: () => void;
}

/** 검색 화면의 최근 검색어 영역 */
export default function RecentSearchChips({
  keywords,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchChipsProps) {
  return (
    <View className="gap-y-4 rounded-component bg-background-normal px-8 py-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-headline2 font-bold text-label-normal">
          최근 검색어
        </Text>
        {/* 검색어가 있을 때만 전체 삭제 노출 */}
        {keywords.length > 0 && (
          <Pressable onPress={onClearAll} className="active:opacity-70">
            <Text className="text-caption font-medium text-label-alternative opacity-60">
              전체 삭제
            </Text>
          </Pressable>
        )}
      </View>

      {keywords.length === 0 ? (
        <Text className="text-label text-label-alternative">
          최근 검색어가 없습니다.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-x-2 gap-y-[6px]">
          {keywords.map((keyword) => (
            <Pressable
              key={keyword}
              onPress={() => onSelect(keyword)}
              className="h-[30px] flex-row items-center justify-center gap-x-2 rounded-pill bg-background-alternative px-3 active:opacity-70"
            >
              <Text className="text-label font-medium text-label-normal">
                {keyword}
              </Text>
              <Pressable
                onPress={() => onRemove(keyword)}
                hitSlop={8}
                className="active:opacity-60"
              >
                <Ionicons name="close" size={12} color="#5C5E5E" />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
