import type { V1Record, V1ReviewDraft } from "./v1-types";

export const gapOptions = [
  "缺來源脈絡",
  "缺時間",
  "缺地點",
  "缺當事人或窗口",
  "缺原文依據",
];

export const riskOptions = [
  "可能把最新誤看成可信",
  "可能把優先誤看成急迫",
  "可能把已整理誤看成已確認",
  "可能把待確認候選草稿誤看成可行動",
  "可能有 AI 推測",
];

export function buildInitialV1Drafts(
  records: V1Record[],
): Record<string, V1ReviewDraft> {
  return Object.fromEntries(
    records.map((record) => [
      record.id,
      {
        recordId: record.id,
        gaps:
          record.verificationStatus === "verified" ? [] : ["缺人工確認結果"],
        risks:
          record.verificationStatus === "verified"
            ? ["仍需確認能否形成待確認候選草稿"]
            : ["未確認資訊不能直接變成任務"],
        decision:
          record.verificationStatus === "verified"
            ? "unreviewed"
            : "needs_review",
        note:
          record.verificationStatus === "verified"
            ? "先檢查原文依據與是否會誤導下一位協作者。"
            : "目前只能標示為需要人工確認，不能顯示成已確認或可行動。",
        evidenceNote: "",
        aiSuggestionReview: "尚未採用 AI 建議；需要人類檢查。",
      },
    ]),
  );
}

export function toggleListItem(items: string[], item: string): string[] {
  return items.includes(item)
    ? items.filter((currentItem) => currentItem !== item)
    : [...items, item];
}

export function labelForDecision(decision: V1ReviewDraft["decision"]) {
  const labels: Record<V1ReviewDraft["decision"], string> = {
    unreviewed: "尚未判斷",
    needs_review: "待人工確認",
    hold: "暫時保留",
    candidate: "待確認候選草稿",
  };

  return labels[decision];
}
