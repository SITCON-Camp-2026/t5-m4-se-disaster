import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { SourceLabel } from "../../components/SourceLabel";
import { formatDateTime } from "../../lib/date";
import {
  buildInitialV1Drafts,
  gapOptions,
  labelForDecision,
  riskOptions,
  toggleListItem,
} from "./v1-review-drafts";
import type { V1Decision, V1Record, V1ReviewDraft } from "./v1-types";

const decisionOptions: Array<{
  value: V1Decision;
  label: string;
  helper: string;
}> = [
  {
    value: "needs_review",
    label: "待人工確認",
    helper: "資訊不足或需要確認來源、時間、地點、當事人、窗口。",
  },
  {
    value: "hold",
    label: "暫時保留",
    helper: "先保留原文，不建立待確認候選草稿，也不直接變成任務。",
  },
  {
    value: "candidate",
    label: "待確認候選草稿",
    helper: "只能表示整理草稿；仍需人工確認，不能派工或行動。",
  },
];

function buildRecordSummary(drafts: Record<string, V1ReviewDraft>) {
  const values = Object.values(drafts);
  return {
    needsReview: values.filter((draft) => draft.decision === "needs_review")
      .length,
    held: values.filter((draft) => draft.decision === "hold").length,
    candidates: values.filter((draft) => draft.decision === "candidate").length,
    risky: values.filter((draft) => draft.risks.length > 0).length,
  };
}

export function V1FlowWorkbench({
  drafts,
  records,
  selectedRecordId,
  onSelect,
  onReset,
  onUpdateDraft,
}: {
  drafts: Record<string, V1ReviewDraft>;
  records: V1Record[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
  onReset: () => void;
  onUpdateDraft: (recordId: string, nextDraft: V1ReviewDraft) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const selectedDraft =
    drafts[selectedRecord.id] ??
    buildInitialV1Drafts([selectedRecord])[selectedRecord.id];
  const summary = buildRecordSummary(drafts);
  const isCandidateAllowed =
    selectedDraft.gaps.length === 0 && selectedDraft.risks.length === 0;

  function updateSelectedDraft(nextDraft: V1ReviewDraft) {
    onUpdateDraft(selectedRecord.id, nextDraft);
  }

  function keepRiskyDraftOutOfCandidate(nextDraft: V1ReviewDraft) {
    const hasUnresolvedIssue =
      nextDraft.gaps.length > 0 || nextDraft.risks.length > 0;

    return hasUnresolvedIssue && nextDraft.decision === "candidate"
      ? {
          ...nextDraft,
          decision: "needs_review" as const,
          note: "仍有缺口或風險，先退回待人工確認；不能派工或行動。",
        }
      : nextDraft;
  }

  function resetAllDrafts() {
    const confirmed = window.confirm(
      "重設會清除所有 v1 人工判斷與紀錄。確定要重設全部判斷嗎？",
    );

    if (confirmed) {
      onReset();
    }
  }

  return (
    <div className="v1-workbench">
      <section className="v1-hero">
        <div>
          <p className="eyebrow">v1 / 資訊整理者流程</p>
          <h2>先讓原始資訊被安全理解，再談待確認候選草稿。</h2>
          <p>
            這裡仍只使用 Phase 0
            原始資訊。待確認候選草稿不是已確認資料，也不能直接變成志工任務。
          </p>
        </div>
        <a className="v1-hero__link" href="/">
          回 Phase 0
        </a>
      </section>

      <section className="v1-summary" aria-label="v1 判斷摘要">
        <article>
          <span>{records.length}</span>
          <p>Phase 0 原始資訊</p>
        </article>
        <article>
          <span>{summary.needsReview}</span>
          <p>待人工確認</p>
        </article>
        <article>
          <span>{summary.held}</span>
          <p>暫時保留</p>
        </article>
        <article>
          <span>{summary.candidates}</span>
          <p>待確認候選草稿</p>
        </article>
        <article>
          <span>{summary.risky}</span>
          <p>仍有誤導風險</p>
        </article>
      </section>

      <div className="v1-layout">
        <aside className="v1-record-list" aria-label="選擇 Phase 0 原始資訊">
          <div className="v1-record-list__header">
            <h3>原始資訊</h3>
            <button type="button" onClick={resetAllDrafts}>
              重設全部判斷
            </button>
          </div>
          {records.map((record) => {
            const draft = drafts[record.id];
            return (
              <button
                className={record.id === selectedRecord.id ? "active" : ""}
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
              >
                <span>
                  <strong>{record.id}</strong>
                  <small>
                    {labelForDecision(draft?.decision ?? "unreviewed")}
                  </small>
                </span>
                <StatusBadge status={record.verificationStatus} />
              </button>
            );
          })}
        </aside>

        <section className="v1-main" aria-label="資訊整理流程">
          <div className="v1-flow-steps">
            <article>
              <span>1</span>
              <strong>讀原文</strong>
              <p>查看原文、資訊取得方式、查核狀態與更新時間。</p>
            </article>
            <article>
              <span>2</span>
              <strong>標缺口與風險</strong>
              <p>標出資料不足、轉述、誤導或 AI 推測風險。</p>
            </article>
            <article>
              <span>3</span>
              <strong>判斷是否足夠</strong>
              <p>足夠且不誤導，才進待確認候選草稿；否則待確認或暫時保留。</p>
            </article>
            <article>
              <span>4</span>
              <strong>留下紀錄</strong>
              <p>記錄原文依據、人工判斷，以及 AI 建議採用或拒絕。</p>
            </article>
          </div>

          <div className="v1-current-record">
            <RecordCard record={selectedRecord} />
            <dl>
              <div>
                <dt>資訊取得方式</dt>
                <dd>
                  <SourceLabel sourceType={selectedRecord.sourceType} />
                </dd>
              </div>
              <div>
                <dt>查核狀態</dt>
                <dd>
                  <StatusBadge status={selectedRecord.verificationStatus} />
                </dd>
              </div>
              <div>
                <dt>更新時間</dt>
                <dd>{formatDateTime(selectedRecord.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <section className="v1-review-panel">
            <div className="v1-review-panel__column">
              <h3>缺口</h3>
              <div className="v1-chip-group">
                {gapOptions.map((option) => (
                  <button
                    aria-pressed={selectedDraft.gaps.includes(option)}
                    className={
                      selectedDraft.gaps.includes(option) ? "active" : ""
                    }
                    key={option}
                    type="button"
                    onClick={() =>
                      updateSelectedDraft(
                        keepRiskyDraftOutOfCandidate({
                          ...selectedDraft,
                          gaps: toggleListItem(selectedDraft.gaps, option),
                        }),
                      )
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="v1-review-panel__column">
              <h3>誤導風險</h3>
              <div className="v1-chip-group">
                {riskOptions.map((option) => (
                  <button
                    aria-pressed={selectedDraft.risks.includes(option)}
                    className={
                      selectedDraft.risks.includes(option) ? "active" : ""
                    }
                    key={option}
                    type="button"
                    onClick={() =>
                      updateSelectedDraft(
                        keepRiskyDraftOutOfCandidate({
                          ...selectedDraft,
                          risks: toggleListItem(selectedDraft.risks, option),
                        }),
                      )
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="v1-decision">
            <div>
              <p className="eyebrow">核心判斷</p>
              <h3>是否足夠且不會誤導下一位協作者？</h3>
              <p>
                即使能建立待確認候選草稿，也仍是待人工確認；AI
                不能自動決定真偽、派工或行動。
              </p>
              {!isCandidateAllowed ? (
                <p className="v1-decision__warning">
                  仍有缺口或風險，請先維持待人工確認或暫時保留。
                </p>
              ) : null}
            </div>
            <div className="v1-decision__options">
              {decisionOptions.map((option) => (
                <button
                  aria-pressed={selectedDraft.decision === option.value}
                  className={
                    selectedDraft.decision === option.value ? "active" : ""
                  }
                  disabled={option.value === "candidate" && !isCandidateAllowed}
                  key={option.value}
                  title={
                    option.value === "candidate" && !isCandidateAllowed
                      ? "完成缺口與風險檢查後，才能建立待確認候選草稿。"
                      : undefined
                  }
                  type="button"
                  onClick={() =>
                    updateSelectedDraft({
                      ...selectedDraft,
                      decision: option.value,
                      note:
                        option.value === "candidate" && !isCandidateAllowed
                          ? "仍有缺口或風險，這只能作為待確認候選草稿，不能派工或行動。"
                          : selectedDraft.note,
                    })
                  }
                >
                  <strong>{option.label}</strong>
                  <span>{option.helper}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="v1-log-editor">
            <label>
              原文依據或整理摘要
              <textarea
                value={selectedDraft.evidenceNote}
                placeholder="只寫原文看得出的內容；推測請留到 AI 建議檢查或人工判斷。"
                onChange={(event) =>
                  updateSelectedDraft({
                    ...selectedDraft,
                    evidenceNote: event.target.value,
                  })
                }
              />
            </label>
            <label>
              人工判斷紀錄
              <textarea
                value={selectedDraft.note}
                onChange={(event) =>
                  updateSelectedDraft({
                    ...selectedDraft,
                    note: event.target.value,
                  })
                }
              />
            </label>
            <label>
              AI 建議採用或拒絕理由
              <textarea
                value={selectedDraft.aiSuggestionReview}
                onChange={(event) =>
                  updateSelectedDraft({
                    ...selectedDraft,
                    aiSuggestionReview: event.target.value,
                  })
                }
              />
            </label>
          </section>

          <section className="v1-output" aria-label="輸出狀態">
            <div>
              <p className="eyebrow">輸出</p>
              <h3>{labelForDecision(selectedDraft.decision)}</h3>
              <p>
                {selectedDraft.decision === "candidate"
                  ? "待確認候選草稿仍需人工確認，不是 confirmed / verified，不能派工或行動。"
                  : "這筆資訊目前不應直接變成任務或行動。"}
              </p>
            </div>
            <ul>
              <li>
                缺口：
                {selectedDraft.gaps.join("、") || "尚未完成缺口檢查"}
              </li>
              <li>
                風險：
                {selectedDraft.risks.join("、") || "尚未完成風險檢查"}
              </li>
              <li>原文依據：{selectedDraft.evidenceNote || "尚未填寫"}</li>
              <li>人工紀錄：{selectedDraft.note || "尚未填寫"}</li>
              <li>
                AI 建議檢查：{selectedDraft.aiSuggestionReview || "尚未填寫"}
              </li>
            </ul>
          </section>
        </section>
      </div>
    </div>
  );
}
