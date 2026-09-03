import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "community",
};

export default function CommunityLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
