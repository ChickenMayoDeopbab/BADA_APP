import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_STORAGE_KEY = "recentScenarioSearches";
const MAX_RECENT_SEARCHES = 10; // 보관할 최근 검색어 최대 개수

interface UseRecentSearchesOptions {
  storageKey?: string;
}

/**
 * 최근 검색어를 화면별 저장 키로 나눠 기기에 보관한다.
 * 서버에 최근 검색어 API가 없어 AsyncStorage로만 관리한다.
 */
export const useRecentSearches = ({
  storageKey = DEFAULT_STORAGE_KEY,
}: UseRecentSearchesOptions = {}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored);
        // 깨진 값이 섞여 있으면 렌더 중 크래시가 나므로 문자열만 남긴다
        if (Array.isArray(parsed)) {
          const latestSearches = Array.from(
            new Set(
              parsed
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          ).slice(0, MAX_RECENT_SEARCHES);
          setRecentSearches(latestSearches);
          void AsyncStorage.setItem(
            storageKey,
            JSON.stringify(latestSearches),
          ).catch(() => {
            // 정리된 목록 재저장 실패는 화면 표시에는 영향을 주지 않는다
          });
        }
      })
      .catch(() => {
        // 저장된 값이 깨졌으면 빈 목록으로 시작한다
      });
  }, [storageKey]);

  /** 최근 검색어 목록을 갱신하고 기기에도 저장 */
  const persist = useCallback((next: string[]) => {
    setRecentSearches(next);
    AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {
      // 저장 실패는 조용히 무시 (메모리 상태는 유지)
    });
  }, [storageKey]);

  /** 검색어 추가 (중복은 최신 순서로 끌어올림) */
  const addRecentSearch = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;

      // setState 업데이터는 순수해야 하므로(StrictMode에서 재실행됨)
      // 다음 목록을 먼저 계산한 뒤 저장한다
      persist(
        [
          trimmed,
          ...recentSearches.filter((item) => item !== trimmed),
        ].slice(0, MAX_RECENT_SEARCHES),
      );
    },
    [persist, recentSearches],
  );

  /** 검색어 한 건 삭제 */
  const removeRecentSearch = useCallback(
    (keyword: string) => {
      persist(recentSearches.filter((item) => item !== keyword));
    },
    [persist, recentSearches],
  );

  /** 최근 검색어 전체 삭제 */
  const clearRecentSearches = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
};
