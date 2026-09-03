import { TextInput, TextInputProps, View } from "react-native";
import SearchIconButton from "./SearchIconButton";

interface SearchBoxProps extends TextInputProps {
  /** 검색 아이콘을 눌렀을 때 (없으면 아이콘이 장식으로만 보인다) */
  onSearch?: () => void;
}

/** 입력창 + 검색 아이콘 버튼으로 이루어진 검색 상자 */
export default function SearchBox({ onSearch, ...props }: SearchBoxProps) {
  return (
    <View className="h-12 flex-1 flex-row items-center justify-between rounded-component bg-fill-neutral px-[10px]">
      <TextInput
        className="flex-1 text-headline2 font-medium text-label-normal"
        placeholderTextColor="#BDBEBE"
        returnKeyType="search"
        {...props}
      />
      <SearchIconButton onPress={onSearch} size={26} />
    </View>
  );
}
