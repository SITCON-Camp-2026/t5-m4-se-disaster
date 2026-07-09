import type { Phase0MessyRecord } from "../phase-0/phase0-types";

export type V1Decision = "unreviewed" | "needs_review" | "hold" | "candidate";

export type V1ReviewDraft = {
  recordId: string;
  gaps: string[];
  risks: string[];
  decision: V1Decision;
  note: string;
  evidenceNote: string;
  aiSuggestionReview: string;
};

export type V1Record = Phase0MessyRecord;
