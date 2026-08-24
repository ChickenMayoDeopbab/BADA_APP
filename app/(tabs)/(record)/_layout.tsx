import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "record/index",
};

export default function RecordLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
