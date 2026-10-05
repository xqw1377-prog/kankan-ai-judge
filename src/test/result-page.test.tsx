import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import Result from "@/pages/Result";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}));

const analysis = {
  food: "红烧肉盖饭",
  calories: 640,
  protein_g: 22,
  fat_g: 28,
  carbs_g: 70,
  ingredients: [{ name: "红烧肉", grams: 120 }, { name: "米饭", grams: 200 }],
  verdict: "油脂偏高。下一句不该默认出现。",
  suggestion: "先吃青菜。然后再加肉。",
  analysis_id: "analysis-1",
};

function renderResult() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[{ pathname: "/result", state: { result: analysis } }]}>
        <Routes>
          <Route path="/result" element={<Result />} />
          <Route path="/login" element={<div>登录页</div>} />
          <Route path="/edit-ingredients" element={<div>编辑食材页</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("result page", () => {
  it("shows three lines and keeps the rest collapsed", () => {
    renderResult();
    const details = document.querySelector("details");
    expect(details?.open).toBe(false);
    const summary = details?.querySelector("summary");
    const lines = (document.body.textContent ?? "").split(summary?.textContent ?? "更多细节")[0];
    expect(lines).toContain("红烧肉、米饭");
    expect(lines).toContain("油脂偏高。");
    expect(lines).toContain("先吃青菜。");
    expect(lines).not.toContain("下一句不该默认出现");
    fireEvent.click(screen.getByText("更多细节"));
    expect(details?.open).toBe(true);
    expect(details?.textContent).toContain("640");
    expect(details?.textContent).toContain("下一句不该默认出现");
  });

  it("turns save into sign-in when there is no session", async () => {
    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "记到记录" }));
    expect(await screen.findByRole("button", { name: "登录" })).toBeVisible();
  });

  it("opens ingredient editing from the collapsed section", () => {
    renderResult();
    fireEvent.click(screen.getByText("更多细节"));
    fireEvent.click(screen.getByRole("button", { name: "编辑食材" }));
    expect(screen.getByText("编辑食材页")).toBeVisible();
  });
});
