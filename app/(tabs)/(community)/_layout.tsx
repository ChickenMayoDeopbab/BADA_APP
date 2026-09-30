import { Stack } from "expo-router";
import { CommunityPostDraftProvider } from "@/context/CommunityPostDraftContext";
import { FAST_STACK_SCREEN_OPTIONS } from "@/constants/navigation";

export const unstable_settings = {
  initialRouteName: "community",
};

export default function CommunityLayout() {
  return (
    <CommunityPostDraftProvider>
      <Stack screenOptions={FAST_STACK_SCREEN_OPTIONS} />
    </CommunityPostDraftProvider>
  );
}
