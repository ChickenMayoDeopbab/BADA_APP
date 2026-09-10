import { useInfiniteQuery } from "@tanstack/react-query";
import { getTrainingRecords } from "@/api/recordApi";

const PAGE_SIZE = 20;

interface UseTrainingRecordsParams {
  size?: number;
}

export const useTrainingRecords = ({
  size = PAGE_SIZE,
}: UseTrainingRecordsParams = {}) => {
  return useInfiniteQuery({
    queryKey: ["trainingRecords", { size }],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getTrainingRecords({
        page: pageParam,
        size,
      });
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.last) return undefined;
      return allPages.length;
    },
  });
};
