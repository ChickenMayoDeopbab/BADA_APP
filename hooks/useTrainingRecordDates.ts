import { getTrainingRecords } from "@/api/recordApi";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const DATE_PAGE_SIZE = 100;

export const useTrainingRecordDates = () =>
  useQuery({
    queryKey: ["trainingRecordDates"],
    queryFn: async () => {
      const records = [];
      let page = 0;
      let isLastPage = false;

      while (!isLastPage) {
        const response = await getTrainingRecords({
          page,
          size: DATE_PAGE_SIZE,
        });

        records.push(...response.data.content);

        isLastPage = response.data.last;
        page += 1;
      }

      return {
        records,
        dates: [
          ...new Set(
            records.map((record) =>
              format(new Date(record.trainedAt), "yyyy-MM-dd"),
            ),
          ),
        ],
      };
    },
    staleTime: 1000 * 60 * 5,
  });
