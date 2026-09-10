import { Stack } from "expo-router";
import { CommunityPostDraftProvider } from "@/context/CommunityPostDraftContext";

export const unstable_settings = {
  initialRouteName: "community",
};

export default function CommunityLayout() {
  return (
    <CommunityPostDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CommunityPostDraftProvider>
  );
}
