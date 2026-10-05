import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import MealDetail from "@/pages/MealDetail";

vi.mock("@/hooks/useMeals", () => ({
  useMeals: () => ({
    meals: [{
      id: "meal-1",
      food_name: "青菜",
      meal_type: "lunch",
      calories: 80,
      protein_g: 2,
      fat_g: 1,
      carbs_g: 10,
      ingredients: [],
      verdict: "",
      suggestion: "",
      recorded_at: "2026-10-05T08:00:00.000Z",
      sequence_score: null,
    }],
    deleteMeal: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      device_id: "",
      onboarding_completed: true,
      details_skipped: true,
      targets: null,
      targetsFromServer: false,
    },
  }),
}));

describe("meal detail without targets", () => {
  it("renders the stored meal when profile.targets is null", () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/meal/meal-1"]}>
          <Routes>
            <Route path="/meal/:id" element={<MealDetail />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(screen.getByText("青菜")).toBeVisible();
    expect(screen.getByText(/80 kcal/)).toBeVisible();
  });
});
