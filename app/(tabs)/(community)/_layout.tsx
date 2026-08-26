import { Stack } from "expo-router";
import { CommunityProvider } from "@/context/CommunityContext";

export const unstable_settings = {
  initialRouteName: "community",
};

export default function CommunityLayout() {
  return (
    <CommunityProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CommunityProvider>
  );
}
