import { EmptyState } from "../../components/EmptyState";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import { confidenceLevels } from "./phase0-drafts";
import type { Phase0MessyRecord, Phase0SavedDraft } from "./phase0-types";

const kindLabels: Record<Phase0SavedDraft["possibleKind"], string> = {
  help_request_candidate: "求助候選",
  site_status_candidate: "地點狀態候選",
  task_candidate: "任務候選",
  assignment_candidate: "人員指派候選",
  announcement_candidate: "公告候選",
  unknown: "候選類型待判斷",
};

function labelForConfidence(confidence: Phase0SavedDraft["confidence"]) {
  return (
    confidenceLevels.find((level) => level.value === confidence)?.label ?? "低"
  );
}

export function Phase0SavedPanel({
  records,
  savedDrafts,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  savedDrafts: Record<string, Phase0SavedDraft>;
  onSelect: (recordId: string) => void;
}) {
  const savedItems = Object.values(savedDrafts)
    .map((draft) => ({
      draft,
      record: records.find((record) => record.id === draft.messyRecordId),
    }))
    .filter(
      (item): item is { draft: Phase0SavedDraft; record: Phase0MessyRecord } =>
        Boolean(item.record),
    );

  return (
    <div className="saved-panel">
      <div className="panel__header">
        <div>
          <h2>已整理的</h2>
          <p>這裡只放已儲存的整理草稿，不代表資料已確認。</p>
        </div>
        <p>{savedItems.length} 筆草稿</p>
      </div>

      {savedItems.length === 0 ? (
        <EmptyState message="還沒有儲存任何整理草稿" />
      ) : (
        <div className="saved-grid">
          {savedItems.map(({ draft, record }) => (
            <article className="saved-card" key={draft.messyRecordId}>
              <div className="saved-card__header">
                <div>
                  <p className="eyebrow">已儲存整理草稿</p>
                  <h3>{record.id}</h3>
                </div>
                <StatusBadge status={record.verificationStatus} />
              </div>

              <p className="saved-card__summary">
                {draft.candidateSummary || "尚未填寫候選大意"}
              </p>

              <dl className="saved-card__facts">
                <div>
                  <dt>候選類型</dt>
                  <dd>{kindLabels[draft.possibleKind]}</dd>
                </div>
                <div>
                  <dt>把握程度</dt>
                  <dd>{labelForConfidence(draft.confidence)}</dd>
                </div>
                <div>
                  <dt>確認對象</dt>
                  <dd>{draft.humanReviewTarget || "尚未填寫"}</dd>
                </div>
              </dl>

              <section>
                <h4>風險與卡住原因</h4>
                <div className="risk-tags">
                  {draft.blockers.length > 0 ? (
                    draft.blockers.map((blocker) => (
                      <span key={blocker}>{blocker}</span>
                    ))
                  ) : (
                    <span>尚未標示</span>
                  )}
                </div>
              </section>

              <div className="saved-card__meta">
                <SourceLabel sourceType={record.sourceType} />
                <span>原始資訊更新：{formatDateTime(record.updatedAt)}</span>
                <span>草稿儲存：{formatDateTime(draft.savedAt)}</span>
              </div>

              <button type="button" onClick={() => onSelect(record.id)}>
                回到工作台編輯
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
