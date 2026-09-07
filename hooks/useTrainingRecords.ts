import { useInfiniteQuery } from "@tanstack/react-query";
import { getTrainingRecords } from "@/api/recordApi";

const PAGE_SIZE = 20;

interface UseTrainingRecordsParams {
  sort: string;
  date?: string;
}

export const useTrainingRecords = ({ sort, date }: UseTrainingRecordsParams) => {
  return useInfiniteQuery({
    queryKey: ["trainingRecords", { sort, date }],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getTrainingRecords({
        page: pageParam,
        size: PAGE_SIZE,
        sort,
        date,
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