import { useQuery } from "@tanstack/react-query";
import { getTrainingRecord } from "@/api/recordApi";

export const useTrainingRecordDetail = (recordId: number) => {
  return useQuery({
    queryKey: ["trainingRecordDetail", recordId],
    queryFn: async () => {
      const res = await getTrainingRecord(recordId);
      return res.data;
    },
    enabled: !!recordId,
  });
};
