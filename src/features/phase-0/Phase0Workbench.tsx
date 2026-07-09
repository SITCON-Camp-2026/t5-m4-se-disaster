import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import {
  addOrRemoveItem,
  buildEmptyDraft,
  confidenceLevels,
  riskOptions,
} from "./phase0-drafts";
import { createPhase0Judgement } from "./phase0-heuristics";
import type {
  Phase0Confidence,
  Phase0EditableDraft,
  Phase0JudgementDraft,
  Phase0MessyRecord,
  Phase0SavedDraft,
} from "./phase0-types";

const kindOptions: Array<{
  value: Phase0JudgementDraft["possibleKind"];
  label: string;
}> = [
  { value: "unknown", label: "尚未判斷" },
  { value: "help_request_candidate", label: "求助候選" },
  { value: "site_status_candidate", label: "地點狀態候選" },
  { value: "task_candidate", label: "任務候選" },
  { value: "assignment_candidate", label: "人員指派候選" },
  { value: "announcement_candidate", label: "公告候選" },
];

const nextStepOptions: Array<{
  value: Phase0JudgementDraft["suggestedNextStep"];
  label: string;
}> = [
  { value: "send_to_human_review", label: "交給人工確認" },
  { value: "ask_for_more_info", label: "補問來源或現場資訊" },
  { value: "keep_raw", label: "先保留原始資訊" },
  { value: "create_candidate_report", label: "建立候選通報" },
  { value: "create_site_update_suggestion", label: "建立地點更新建議" },
  { value: "do_not_use_yet", label: "暫時不要使用" },
];

const workflowSteps = [
  {
    title: "讀原文",
    description: "先看來源、時間、說話者與原文語氣，不急著分類。",
  },
  {
    title: "標出缺口",
    description: "把缺地點、缺時間、轉述、過期或互相矛盾的地方寫下來。",
  },
  {
    title: "寫候選",
    description: "只整理原文看得出的內容，推測要留在質疑或修正欄位。",
  },
  {
    title: "找人確認",
    description: "列出需要誰確認，並保留不能直接變成任務的理由。",
  },
  {
    title: "準備回報",
    description: "用摘要說明目前知道什麼、不知道什麼、AI 哪裡不能直接信。",
  },
];

const readingPrompts = [
  "這句話是當事人、現場志工、家屬、群組，還是截圖轉述？",
  "原文有沒有讓人可以安全判斷時間、地點、數量與同意狀態？",
  "如果把這筆資料直接變成任務，最可能傷害誰或誤導誰？",
];

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildAiReportContent({
  records,
  draftCount,
  savedCount,
  unsafeDraftCount,
  challengedCount,
}: {
  records: Phase0MessyRecord[];
  draftCount: number;
  savedCount: number;
  unsafeDraftCount: number;
  challengedCount: number;
}) {
  const reviewCount = records.filter(
    (record) => record.verificationStatus !== "verified",
  ).length;
  const unverifiedIds = records
    .filter((record) => record.verificationStatus === "unverified")
    .map((record) => record.id)
    .join(", ");
  const needsReviewIds = records
    .filter((record) => record.verificationStatus === "needs_review")
    .map((record) => record.id)
    .join(", ");

  return [
    "Phase 0 AI 協作回報草稿",
    "",
    "使用設定：model_provider=OpenAI, model=gpt-5.5, review_model=gpt-5.5；本工作台只記錄協作設定，沒有在前端呼叫 runtime LLM API。",
    `目前載入 ${records.length} 筆原始資訊，其中 ${reviewCount} 筆仍不是已確認資訊。`,
    `目前有 ${draftCount} 筆可編輯整理草稿，${unsafeDraftCount} 筆標示為不能直接變成志工任務。`,
    `目前有 ${savedCount} 筆已儲存整理草稿；這些仍不是已確認資料。`,
    `目前記錄 ${challengedCount} 個人類質疑或修正 agent 判斷的地方。`,
    "",
    `needs_review：${needsReviewIds || "無"}`,
    `unverified：${unverifiedIds || "無"}`,
    "",
    "回報重點：",
    "1. 未查核或需要人工確認的資訊不能顯示成 confirmed / verified。",
    "2. 候選整理只能作為討論草稿，不是正式整理後資料。",
    "3. 模糊地點、轉述來源、過期截圖與當事人同意都需要人工確認。",
    "4. Agent 產出的合理推測要被標記為推測，不能寫成原文事實。",
  ].join("\n");
}

export function Phase0Workbench({
  drafts,
  records,
  savedDrafts,
  selectedRecordId,
  onCreateDraft,
  onDeleteDraft,
  onResetDrafts,
  onSaveDraft,
  onSelect,
  onUpdateDraft,
}: {
  drafts: Record<string, Phase0EditableDraft>;
  records: Phase0MessyRecord[];
  savedDrafts: Record<string, Phase0SavedDraft>;
  selectedRecordId: string;
  onCreateDraft: (record: Phase0MessyRecord) => void;
  onDeleteDraft: (recordId: string) => void;
  onResetDrafts: () => void;
  onSaveDraft: (recordId: string) => void;
  onSelect: (recordId: string) => void;
  onUpdateDraft: (recordId: string, nextDraft: Phase0EditableDraft) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const safetyBoundary = createPhase0Judgement(selectedRecord);
  const selectedDraft = drafts[selectedRecord.id];
  const draftCount = Object.keys(drafts).length;
  const unsafeDraftCount = Object.values(drafts).filter(
    (draft) => draft.unsafeToActDirectly,
  ).length;
  const challengedCount = Object.values(drafts).filter(
    (draft) => draft.humanChallenge.trim().length > 0,
  ).length;
  const savedCount = Object.keys(savedDrafts).length;
  const aiReportContent = buildAiReportContent({
    records,
    draftCount,
    savedCount,
    unsafeDraftCount,
    challengedCount,
  });

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台</p>
        <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
        <p>
          這裡可以建立可編輯草稿，但草稿仍然只是候選整理，不是已確認事實；這不是
          runtime LLM 分析，也不是正式資料模型。
        </p>
      </div>

      <section className="workflow-guide" aria-label="建議使用流程">
        <div className="workflow-guide__header">
          <p className="eyebrow">使用流程</p>
          <h3>像整理田野筆記一樣處理混亂資訊</h3>
        </div>
        <ol>
          {workflowSteps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          {records.map((record) => (
            <button
              className={record.id === selectedRecord.id ? "active" : ""}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <span>{record.id}</span>
              <StatusBadge status={record.verificationStatus} />
            </button>
          ))}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          <section className="reading-lens" aria-label="人文式閱讀提醒">
            <div>
              <p className="eyebrow">人文式閱讀提醒</p>
              <h3>先照顧脈絡，再整理成欄位</h3>
            </div>
            <ul>
              {readingPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </section>

          {selectedDraft ? (
            <article className="draft-editor">
              <div className="draft-editor__header">
                <div>
                  <p className="eyebrow">可編輯整理草稿</p>
                  <h3>{selectedRecord.id} 的候選整理</h3>
                </div>
                <StatusBadge status={selectedRecord.verificationStatus} />
              </div>

              <label className="draft-editor__field">
                候選大意
                <textarea
                  value={selectedDraft.candidateSummary}
                  onChange={(event) =>
                    onUpdateDraft(selectedRecord.id, {
                      ...selectedDraft,
                      candidateSummary: event.target.value,
                    })
                  }
                  placeholder="只能寫原文看得出來的內容；不確定就留白或標記待確認。"
                />
              </label>

              <section className="draft-control">
                <h4>可能類型</h4>
                <div className="draft-segmented">
                  {kindOptions.map((option) => (
                    <button
                      aria-pressed={selectedDraft.possibleKind === option.value}
                      className={
                        selectedDraft.possibleKind === option.value
                          ? "active"
                          : ""
                      }
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          possibleKind: option.value,
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="draft-editor__controls">
                <section className="draft-control">
                  <h4>把握程度</h4>
                  <label className="confidence-slider">
                    <input
                      aria-label="把握程度"
                      max={confidenceLevels.length - 1}
                      min={0}
                      type="range"
                      value={confidenceLevels.findIndex(
                        (level) => level.value === selectedDraft.confidence,
                      )}
                      onChange={(event) => {
                        const nextLevel =
                          confidenceLevels[Number(event.target.value)] ??
                          confidenceLevels[0];
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          confidence: nextLevel.value as Phase0Confidence,
                        });
                      }}
                    />
                    <span>
                      {
                        confidenceLevels.find(
                          (level) => level.value === selectedDraft.confidence,
                        )?.label
                      }
                    </span>
                  </label>
                  <p>
                    {
                      confidenceLevels.find(
                        (level) => level.value === selectedDraft.confidence,
                      )?.helper
                    }
                  </p>
                </section>

                <label className="draft-editor__field">
                  下一步
                  <select
                    value={selectedDraft.suggestedNextStep}
                    onChange={(event) =>
                      onUpdateDraft(selectedRecord.id, {
                        ...selectedDraft,
                        suggestedNextStep: event.target
                          .value as Phase0JudgementDraft["suggestedNextStep"],
                      })
                    }
                  >
                    {nextStepOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <section className="draft-control">
                <div className="draft-control__header">
                  <h4>風險標籤</h4>
                  <label className="draft-switch">
                    <input
                      checked={selectedDraft.unsafeToActDirectly}
                      type="checkbox"
                      onChange={(event) =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          unsafeToActDirectly: event.target.checked,
                        })
                      }
                    />
                    <span>不能直接變任務</span>
                  </label>
                </div>
                <div className="risk-tags risk-tags--interactive">
                  {riskOptions.map((risk) => (
                    <button
                      aria-pressed={selectedDraft.blockers.includes(risk)}
                      className={
                        selectedDraft.blockers.includes(risk) ? "active" : ""
                      }
                      key={risk}
                      type="button"
                      onClick={() =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          blockers: addOrRemoveItem(
                            selectedDraft.blockers,
                            risk,
                          ),
                        })
                      }
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </section>

              <label className="draft-editor__field">
                需要誰進一步確認
                <input
                  value={selectedDraft.humanReviewTarget}
                  onChange={(event) =>
                    onUpdateDraft(selectedRecord.id, {
                      ...selectedDraft,
                      humanReviewTarget: event.target.value,
                    })
                  }
                  placeholder="例如：現場窗口、來源發布者、小組人工確認"
                />
              </label>

              <details className="draft-details">
                <summary>需要詳細回報時再補</summary>
                <div className="draft-details__body">
                  <label className="draft-editor__field">
                    原文依據
                    <textarea
                      value={selectedDraft.evidence.join("\n")}
                      onChange={(event) =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          evidence: splitLines(event.target.value),
                        })
                      }
                      placeholder="一行一個依據。只放原文或畫面可追溯的內容。"
                    />
                  </label>

                  <label className="draft-editor__field">
                    人類質疑或修正 agent 的地方
                    <input
                      value={selectedDraft.humanChallenge}
                      onChange={(event) =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          humanChallenge: event.target.value,
                        })
                      }
                      placeholder="例如：agent 補了原文沒有的地點或角色"
                    />
                  </label>

                  <label className="draft-editor__field">
                    其他卡住的原因
                    <textarea
                      value={selectedDraft.blockers.join("\n")}
                      onChange={(event) =>
                        onUpdateDraft(selectedRecord.id, {
                          ...selectedDraft,
                          blockers: splitLines(event.target.value),
                        })
                      }
                      placeholder="需要補充時再寫；簡單風險可直接用上面的標籤。"
                    />
                  </label>
                </div>
              </details>

              <div className="draft-editor__actions">
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => onSaveDraft(selectedRecord.id)}
                >
                  儲存整理
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDraft(
                      selectedRecord.id,
                      buildEmptyDraft(selectedRecord),
                    )
                  }
                >
                  重設這筆草稿
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDraft(selectedRecord.id)}
                >
                  刪除草稿
                </button>
              </div>
            </article>
          ) : (
            <article className="draft-empty">
              <p className="eyebrow">尚未建立整理草稿</p>
              <h3>{selectedRecord.id} 還沒有草稿</h3>
              <p>
                可以建立一張保守草稿，再由人類填入依據、卡住原因與下一步；建立草稿不代表這筆資訊已確認。
              </p>
              <button
                type="button"
                onClick={() => onCreateDraft(selectedRecord)}
              >
                建立草稿
              </button>
            </article>
          )}

          <Phase0JudgementCard
            judgement={safetyBoundary}
            record={selectedRecord}
          />
        </div>

        <aside className="workbench__checklist">
          <div className="workbench__checklist-header">
            <h3>第一階段完成檢查</h3>
            <button type="button" onClick={onResetDrafts}>
              重設全部草稿
            </button>
          </div>
          <ul>
            <li>Starter 已載入 {records.length} 筆原始資訊</li>
            <li>目前有 {draftCount} 筆可編輯整理草稿</li>
            <li>目前有 {savedCount} 筆已儲存整理草稿</li>
            <li>{unsafeDraftCount} 筆草稿標示為不能直接變成任務</li>
            <li>{challengedCount} 個 agent 判斷已記錄人類質疑或修正</li>
            <li>
              把資料品質問題寫進 observations，並記錄 agent 哪裡不能直接相信
            </li>
          </ul>

          <section className="ai-report">
            <p className="eyebrow">AI 回報內容</p>
            <h4>可複製的協作摘要</h4>
            <p>
              這段是依畫面狀態產生的回報草稿，沒有呼叫外部模型，也沒有送出任何原始資訊。
            </p>
            <textarea readOnly value={aiReportContent} />
          </section>
        </aside>
      </div>
    </div>
  );
}
