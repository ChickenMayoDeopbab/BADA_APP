import { FAST_STACK_SCREEN_OPTIONS } from "@/constants/navigation";
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "home",
};

export default function HomeLayout() {
  return <Stack screenOptions={FAST_STACK_SCREEN_OPTIONS} />;
}
