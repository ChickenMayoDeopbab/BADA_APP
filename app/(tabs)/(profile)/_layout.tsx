import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "profile/index",
};

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
