import Top from "@/components/common/Top/Top";
import { View } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Top isMain/>
    </View>
  )
}