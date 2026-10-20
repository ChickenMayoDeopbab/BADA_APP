interface FeedbackHighlightFields {
  title?: string | null;
  content?: string | null;
  good_point?: string | null;
  summary?: string | null;
}

/** 새 하이라이트 제목·설명을 우선 사용하고 이전 기록의 피드백 문구를 보완한다. */
export function getFeedbackHighlightText(highlight: FeedbackHighlightFields) {
  const explicitTitle = highlight.title?.trim();
  const legacyTitle = highlight.good_point?.trim();
  const explicitContent = highlight.content?.trim() || highlight.summary?.trim() || "";
  const title = explicitTitle || (legacyTitle !== explicitContent ? legacyTitle : "") || "통화 하이라이트";
  const content = explicitContent ||
    (explicitTitle && legacyTitle !== title ? legacyTitle : "") || "";

  return { title, content };
}
