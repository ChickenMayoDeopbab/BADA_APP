import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "list",
};

export default function TrainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
        Stack에 Screen을 선언하면 선언한 순서가 나머지 라우트보다 앞으로 당겨진다.
        마운트 시 초기 화면은 children의 첫 번째로 결정되므로(unstable_settings의
        initialRouteName은 linking config에만 반영된다) list를 반드시 먼저 선언한다.
      */}
      <Stack.Screen name="list" />
      {/* 시나리오 상세는 목록 위에 뜨는 바텀시트라 배경이 비치는 모달로 띄운다 */}
      <Stack.Screen
        name="detail/[id]"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      {/*
        상세(transparentModal) 위에서 push되면 iOS가 뒤따르는 화면도 모달 컨텍스트로 보고
        pageSheet(둥근 모서리 + 뒤 화면 노출)로 그린다.
        통화 흐름은 화면을 온전히 점유해야 하므로 전체 화면 모달로 못박는다.
      */}
      <Stack.Screen name="train" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="anxiety" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}
