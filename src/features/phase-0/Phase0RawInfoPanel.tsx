import { useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import type { Phase0MessyRecord, Phase0SavedDraft } from "./phase0-types";

const swipeThreshold = 48;

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

function getCardOffset(index: number, currentIndex: number, length: number) {
  const forward = wrapIndex(index - currentIndex, length);
  const backward = forward - length;
  return Math.abs(forward) <= Math.abs(backward) ? forward : backward;
}

function labelForOffset(offset: number) {
  if (offset === 0) return "目前閱讀";
  if (offset === -1) return "上一筆";
  if (offset === 1) return "下一筆";
  if (offset < -1) return "更前一筆";
  return "更後一筆";
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("button, a, input, textarea, select, summary"))
    : false;
}

export function Phase0RawInfoPanel({
  priorityVotes,
  records,
  savedDrafts,
  selectedRecordId,
  onBoostPriority,
  onSelect,
}: {
  priorityVotes: Record<string, number>;
  records: Phase0MessyRecord[];
  savedDrafts: Record<string, Phase0SavedDraft>;
  selectedRecordId: string;
  onBoostPriority: (recordId: string) => void;
  onSelect: (recordId: string) => void;
}) {
  const [currentRecordId, setCurrentRecordId] = useState(selectedRecordId);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const currentIndex = Math.max(
    records.findIndex((record) => record.id === currentRecordId),
    0,
  );
  const currentRecord = records[currentIndex] ?? records[0];

  function showPrevious() {
    setCurrentRecordId(records[wrapIndex(currentIndex - 1, records.length)].id);
  }

  function showNext() {
    setCurrentRecordId(records[wrapIndex(currentIndex + 1, records.length)].id);
  }

  function finishDrag(clientX: number) {
    if (dragStartX === null) return;
    const distance = clientX - dragStartX;
    setDragStartX(null);

    if (distance > swipeThreshold) {
      showPrevious();
    } else if (distance < -swipeThreshold) {
      showNext();
    }
  }

  return (
    <div className="phase0-raw">
      <div className="panel__header">
        <div>
          <h2>首頁：最新資料</h2>
          <p>
            這裡不是原始資訊倉庫，而是依更新時間與點讚優先級呈現目前最新資料；仍不能當成已確認事實。
          </p>
        </div>
        <p>
          第 {currentIndex + 1} / {records.length} 筆
        </p>
      </div>

      <div
        className="raw-carousel"
        onPointerCancel={() => setDragStartX(null)}
        onPointerDown={(event) => {
          if (isInteractiveElement(event.target)) {
            return;
          }

          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStartX(event.clientX);
        }}
        onPointerUp={(event) => {
          if (isInteractiveElement(event.target)) {
            setDragStartX(null);
            return;
          }

          finishDrag(event.clientX);
        }}
      >
        {records.map((record, recordIndex) => {
          const offset = getCardOffset(
            recordIndex,
            currentIndex,
            records.length,
          );

          return (
            <article
              aria-hidden={record.id !== currentRecord.id}
              className="raw-carousel__card record-card"
              data-position={Math.abs(offset) > 2 ? "hidden" : offset}
              key={record.id}
            >
              <p className="raw-carousel__role">{labelForOffset(offset)}</p>
              <div className="record-card__labels">
                {recordIndex === 0 ? <span>最新排序</span> : null}
                {savedDrafts[record.id] ? <span>已整理草稿</span> : null}
                {(priorityVotes[record.id] ?? 0) > 0 ? (
                  <span>優先 +{priorityVotes[record.id]}</span>
                ) : null}
              </div>
              <div className="record-card__header">
                <div>
                  <h3>{record.id}</h3>
                  <p className="record-card__count">
                    最新資料 {recordIndex + 1} / {records.length}
                  </p>
                </div>
                <StatusBadge status={record.verificationStatus} />
              </div>
              <p>{record.rawText}</p>
              <div className="record-card__meta">
                <SourceLabel sourceType={record.sourceType} />
                <span>更新：{formatDateTime(record.updatedAt)}</span>
              </div>
              {record.id === currentRecord.id ? (
                <div className="record-card__actions">
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onClick={() => onSelect(record.id)}
                  >
                    送到整理工作台
                  </button>
                  <button
                    className="priority-button"
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onClick={() => onBoostPriority(record.id)}
                  >
                    讚 {priorityVotes[record.id] ?? 0}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="raw-carousel__controls" aria-label="切換原始資訊">
        <button type="button" onClick={showPrevious}>
          上一張
        </button>
        <div>
          <strong>{currentRecord.id}</strong>
          <span>中間這張是目前閱讀的最新資料</span>
        </div>
        <button type="button" onClick={showNext}>
          下一張
        </button>
      </div>
    </div>
  );
}
