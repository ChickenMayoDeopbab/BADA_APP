import { useQuery } from "@tanstack/react-query";
import { getTrainingRecordDetail } from "@/api/recordApi";

export const useTrainingRecordDetail = (recordId: number) => {
  return useQuery({
    queryKey: ["trainingRecordDetail", recordId],
    queryFn: async () => {
      const res = await getTrainingRecordDetail(recordId);
      return res.data;
    },
    enabled: !!recordId,
  });
};