import { getMyPage } from "@/api/userInfoApi";
import { useQuery } from "@tanstack/react-query";

export const myPageQueryKeys = { all: ["myPage"] as const };

/** 프로필과 비밀번호 화면이 같은 응답과 진행 중인 요청을 공유한다. */
export const useMyPage = (enabled = true) => useQuery({
  queryKey: myPageQueryKeys.all,
  queryFn: getMyPage,
  staleTime: 30_000,
  gcTime: 0, // 프로필 화면들이 사라지면 계정 정보도 캐시에서 즉시 제거한다.
  enabled,
});
