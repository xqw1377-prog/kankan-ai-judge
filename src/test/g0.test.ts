import { describe, expect, it } from "vitest";
import { inspectImage, inspectImages, MAX_IMAGES } from "@/lib/imageGuard";
import { isPlaceholderAnalysis, mealResultLines } from "@/lib/foodAnalysis";
import { homeGate } from "@/lib/homeGate";
import { scoreToday } from "@/lib/nutrition";

function dataUrl(mime: string, bytes: number) {
  const raw = "A".repeat(bytes);
  return `data:${mime};base64,${btoa(raw)}`;
}

describe("image guard", () => {
  it("rejects a sixth image and a non-image", () => {
    const one = dataUrl("image/jpeg", 8);
    expect(inspectImages(Array.from({ length: MAX_IMAGES + 1 }, () => one)).ok).toBe(false);
    expect(inspectImage("data:text/plain;base64,YQ==").ok).toBe(false);
  });

  it("accepts a small jpeg", () => {
    expect(inspectImage(dataUrl("image/jpeg", 8)).ok).toBe(true);
  });
});

describe("analysis placeholder", () => {
  it("does not treat zero-calorie 未知食物 as a result", () => {
    expect(isPlaceholderAnalysis({
      food: "未知食物",
      calories: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      verdict: "AI error",
    })).toBe(true);
  });
});

describe("meal result", () => {
  it("keeps the default result to three lines", () => {
    const [seen, problem, action] = mealResultLines({
      food: "红烧肉盖饭",
      ingredients: [{ name: "红烧肉" }, { name: "米饭" }],
      verdict: "油脂偏高。下一句不该出现。",
      suggestion: "先吃【青菜】。然后再加肉。",
    });
    expect([seen, problem, action]).toEqual([
      "红烧肉、米饭",
      "油脂偏高。",
      "先吃【青菜】。",
    ]);
  });
});

describe("saved meal score", () => {
  it("scores only from logged totals", () => {
    const totals = { calories: 500, protein_g: 30, fat_g: 15, carbs_g: 50 };
    const targets = { calories: 2000, protein_g: 120, fat_g: 60, carbs_g: 200 };
    expect(scoreToday({ calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }, targets)).toBe(0);
    expect(scoreToday(totals, targets)).toBe(scoreToday(totals, targets));
    expect(scoreToday(totals, targets)).toBeGreaterThan(0);
  });
});

describe("guest gate", () => {
  it("lets a guest open home without a session", () => {
    expect(homeGate({ hasSession: false, isGuest: true })).toBe("home");
    expect(homeGate({ hasSession: false, isGuest: false })).toBe("login");
  });
});
