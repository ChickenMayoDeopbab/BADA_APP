const GOOD_PARTS = [
  { id: "1", summary: "좋았던 내용\n요약 정리", time: "1:31~1:40" },
  { id: "2", summary: "좋았던 내용\n요약 정리", time: "2:06~2:13" },
  { id: "3", summary: "좋았던 내용\n요약 정리", time: "1:31~1:40" },
];

const SORT_OPTIONS = ["최신 순", "오래된 순"];

const SORT_PARAM_MAP: Record<string, string> = {
  "최신 순": "trainedAt,desc",
  "오래된 순": "trainedAt,asc",
};

export { GOOD_PARTS, SORT_OPTIONS, SORT_PARAM_MAP };