import { useState } from "react";
import messyReports from "../fixtures/phase-0/messy-reports.json";
import { EmptyState } from "../components/EmptyState";
import { Phase0RawInfoPanel } from "../features/phase-0/Phase0RawInfoPanel";
import { Phase0SavedPanel } from "../features/phase-0/Phase0SavedPanel";
import { Phase0Workbench } from "../features/phase-0/Phase0Workbench";
import {
  buildEmptyDraft,
  buildInitialDrafts,
} from "../features/phase-0/phase0-drafts";
import type {
  Phase0EditableDraft,
  Phase0MessyRecord,
  Phase0SavedDraft,
} from "../features/phase-0/phase0-types";

type TabKey = "raw" | "workbench" | "saved";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "raw", label: "首頁" },
  { key: "workbench", label: "整理工作台" },
  { key: "saved", label: "已整理的" },
];

const phase0Records = messyReports satisfies Phase0MessyRecord[];

function sortHomeRecords(
  records: Phase0MessyRecord[],
  priorityVotes: Record<string, number>,
) {
  return [...records].sort((a, b) => {
    const priorityDiff =
      (priorityVotes[b.id] ?? 0) - (priorityVotes[a.id] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("raw");
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const [priorityVotes, setPriorityVotes] = useState<Record<string, number>>(
    {},
  );
  const [selectedRecordId, setSelectedRecordId] = useState(
    sortHomeRecords(phase0Records, {})[0]?.id ?? "",
  );
  const [drafts, setDrafts] = useState<Record<string, Phase0EditableDraft>>(
    () => buildInitialDrafts(phase0Records),
  );
  const [savedDrafts, setSavedDrafts] = useState<
    Record<string, Phase0SavedDraft>
  >({});

  function selectForWorkbench(recordId: string) {
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  function createDraft(record: Phase0MessyRecord) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [record.id]: buildEmptyDraft(record),
    }));
  }

  function updateDraft(recordId: string, nextDraft: Phase0EditableDraft) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [recordId]: nextDraft,
    }));
  }

  function deleteDraft(recordId: string) {
    setDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[recordId];
      return nextDrafts;
    });
  }

  function resetDrafts() {
    setDrafts(buildInitialDrafts(phase0Records));
  }

  function saveDraft(recordId: string) {
    const draft = drafts[recordId];
    if (!draft) return;

    setSavedDrafts((currentSavedDrafts) => ({
      ...currentSavedDrafts,
      [recordId]: {
        ...draft,
        savedAt: new Date().toISOString(),
      },
    }));
    setActiveTab("saved");
  }

  const themeToggleLabel =
    colorMode === "light" ? "切換到深色模式" : "切換到淺色模式";
  const homeRecords = sortHomeRecords(phase0Records, priorityVotes);

  function boostPriority(recordId: string) {
    setPriorityVotes((currentVotes) => ({
      ...currentVotes,
      [recordId]: (currentVotes[recordId] ?? 0) + 1,
    }));
  }

  return (
    <main className="layout" data-theme={colorMode}>
      <header className="hero">
        <div>
          <p className="eyebrow">SITCON Camp 2026</p>
          <h1>災害資訊整理工作台</h1>
          <p>
            第一階段先用 coding agent
            做出可展示的前端原型，再從成果中看見資料品質、角色、狀態與來源的限制。
          </p>
        </div>
        <button
          className="theme-toggle"
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          type="button"
          onClick={() =>
            setColorMode((currentMode) =>
              currentMode === "light" ? "dark" : "light",
            )
          }
        >
          <span className="theme-toggle__icon" aria-hidden="true">
            <span className="theme-toggle__sun" />
            <span className="theme-toggle__moon" />
          </span>
        </button>
      </header>

      <nav className="tabs" aria-label="第一階段工作區">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {phase0Records.length === 0 ? (
          <EmptyState message="目前沒有資料" />
        ) : activeTab === "raw" ? (
          <Phase0RawInfoPanel
            priorityVotes={priorityVotes}
            records={homeRecords}
            savedDrafts={savedDrafts}
            selectedRecordId={selectedRecordId}
            onBoostPriority={boostPriority}
            onSelect={selectForWorkbench}
          />
        ) : activeTab === "workbench" ? (
          <Phase0Workbench
            drafts={drafts}
            records={phase0Records}
            savedDrafts={savedDrafts}
            selectedRecordId={selectedRecordId}
            onCreateDraft={createDraft}
            onDeleteDraft={deleteDraft}
            onResetDrafts={resetDrafts}
            onSaveDraft={saveDraft}
            onSelect={setSelectedRecordId}
            onUpdateDraft={updateDraft}
          />
        ) : (
          <Phase0SavedPanel
            records={phase0Records}
            savedDrafts={savedDrafts}
            onSelect={selectForWorkbench}
          />
        )}
      </section>
    </main>
  );
}
