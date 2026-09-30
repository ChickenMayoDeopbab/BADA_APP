import { FAST_STACK_SCREEN_OPTIONS } from "@/constants/navigation";
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "record/index",
};

export default function RecordLayout() {
  return <Stack screenOptions={FAST_STACK_SCREEN_OPTIONS} />;
}
