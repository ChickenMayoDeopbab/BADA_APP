import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "list",
};

export default function TrainLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
