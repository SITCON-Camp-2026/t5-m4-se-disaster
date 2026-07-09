import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders starter title", () => {
    render(<App />);
    expect(screen.getByText("災害資訊整理工作台")).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "首頁" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "整理工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "已整理的" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows latest reports as a prioritized swipeable card stack", () => {
    render(<App />);

    expect(screen.getByText("首頁：最新資料")).toBeInTheDocument();
    expect(screen.getByText("目前閱讀")).toBeInTheDocument();
    expect(screen.getByText("上一筆")).toBeInTheDocument();
    expect(screen.getByText("下一筆")).toBeInTheDocument();
    expect(screen.getByText("最新資料 1 / 12")).toBeInTheDocument();
    expect(screen.getAllByText("M-012").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "下一張" }));
    const priorityButton = screen.getByRole("button", { name: "讚 0" });
    fireEvent.pointerDown(priorityButton, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(priorityButton, { clientX: 120, pointerId: 1 });
    fireEvent.click(priorityButton);

    expect(screen.getByText("最新資料 1 / 12")).toBeInTheDocument();
    expect(screen.getByText("優先 +1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "讚 1" })).toBeInTheDocument();
  });

  it("shows review states in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(
      screen.getByText(
        "第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("toggles dark mode from the home page", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "切換到深色模式" }));

    expect(
      screen.getByRole("button", { name: "切換到淺色模式" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("深色模式")).not.toBeInTheDocument();
    expect(screen.queryByText("淺色模式")).not.toBeInTheDocument();
  });

  it("supports editable phase 0 drafts without marking them confirmed", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(
      screen.getByText("像整理田野筆記一樣處理混亂資訊"),
    ).toBeInTheDocument();
    expect(screen.getByText("先照顧脈絡，再整理成欄位")).toBeInTheDocument();
    expect(screen.getByText("可編輯整理草稿")).toBeInTheDocument();
    expect(screen.getByText("目前有 12 筆可編輯整理草稿")).toBeInTheDocument();
    expect(screen.getByText("風險標籤")).toBeInTheDocument();
    expect(screen.getByLabelText("把握程度")).toBeInTheDocument();
    expect(screen.getByLabelText("不能直接變任務")).toBeChecked();
    expect(
      screen.getByRole("button", { name: "儲存整理" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("已確認事實")).not.toBeInTheDocument();
  });

  it("saves an edited draft into the saved drafts page", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));
    fireEvent.change(screen.getByLabelText("候選大意"), {
      target: { value: "需要人工確認的候選摘要" },
    });
    fireEvent.click(screen.getByRole("button", { name: "缺時間" }));
    fireEvent.click(screen.getByRole("button", { name: "儲存整理" }));

    expect(screen.getAllByText("已整理的").length).toBeGreaterThan(0);
    expect(screen.getByText("已儲存整理草稿")).toBeInTheDocument();
    expect(screen.getByText("需要人工確認的候選摘要")).toBeInTheDocument();
    expect(
      screen.getByText("這裡只放已儲存的整理草稿，不代表資料已確認。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "首頁" }));

    expect(screen.getByText("已整理草稿")).toBeInTheDocument();
  });

  it("shows an AI collaboration report draft without calling a model", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getByText("AI 回報內容")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/沒有在前端呼叫 runtime LLM API/),
    ).toBeInTheDocument();
  });
});
