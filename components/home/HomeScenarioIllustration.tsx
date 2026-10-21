import PizzaIllustration from "@/assets/home-pizza.svg";
import { View } from "react-native";

/** 홈 추천 카드에는 앱에 포함된 일러스트 아이콘을 표시한다. */
export default function HomeScenarioIllustration() {
  return (
    <View
      pointerEvents="none"
      className="absolute -right-[39px] top-[42px] size-[119px]"
    >
      <PizzaIllustration width={119} height={119} />
    </View>
  );
}
