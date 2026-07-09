import { createPhase0Judgement } from "./phase0-heuristics";
import type {
  Phase0Confidence,
  Phase0EditableDraft,
  Phase0MessyRecord,
} from "./phase0-types";

export const confidenceLevels: Array<{
  value: Phase0Confidence;
  label: string;
  helper: string;
}> = [
  { value: "low", label: "低", helper: "先保守，等人工確認" },
  { value: "medium", label: "中", helper: "有一些原文依據" },
  { value: "high", label: "高", helper: "仍不是已確認事實" },
];

export const riskOptions = [
  "缺時間",
  "缺地點",
  "來源未確認",
  "轉述",
  "資訊可能過期",
  "說法互相矛盾",
  "當事人同意不明",
  "不能直接派工",
];

export function buildEmptyDraft(
  record: Phase0MessyRecord,
): Phase0EditableDraft {
  const judgement = createPhase0Judgement(record);

  return {
    ...judgement,
    evidence: [],
    blockers:
      record.verificationStatus === "verified"
        ? ["流程歸屬待確認"]
        : ["來源未確認", "不能直接派工"],
    candidateSummary: "",
    humanReviewTarget: "",
    humanChallenge: "",
    humanReviewNote: "",
  };
}

export function buildInitialDrafts(records: Phase0MessyRecord[]) {
  return Object.fromEntries(
    records.map((record) => [record.id, buildEmptyDraft(record)]),
  );
}

export function addOrRemoveItem(items: string[], item: string) {
  return items.includes(item)
    ? items.filter((currentItem) => currentItem !== item)
    : [...items, item];
}
