import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasUserBearer } from "../../supabase/functions/_shared/bearer";
import { validateAnalysis, validateIngredientList } from "../../supabase/functions/_shared/analysisContract";
import { hydrateProfile, profileFromServer } from "@/lib/localData";
import { calculateNutrition } from "@/lib/nutrition";

const sane = {
  food: "青菜饭",
  calories: 480,
  protein_g: 20,
  fat_g: 12,
  carbs_g: 60,
  ingredients: [{ name: "米饭", grams: 200 }],
  verdict: "油脂还好。",
  suggestion: "先吃菜。",
};

describe("analysis contract", () => {
  it("rejects negative calories, huge carbs, and non-finite numbers", () => {
    expect(validateAnalysis({
      ...sane,
      calories: -300,
      protein_g: 20,
      fat_g: -50,
      carbs_g: 99999,
    }).ok).toBe(false);
    expect(validateAnalysis({ ...sane, calories: Number.NaN }).ok).toBe(false);
    expect(validateAnalysis({ ...sane, protein_g: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(validateAnalysis({ ...sane, food: "未知食物" }).ok).toBe(false);
    expect(validateIngredientList([{ name: "米饭", grams: 0 }]).ok).toBe(false);
    expect(validateIngredientList([{ name: "米饭", grams: 2001 }]).ok).toBe(false);
    expect(validateIngredientList(Array.from({ length: 31 }, () => ({ name: "米饭", grams: 10 }))).ok).toBe(false);
  });

  it("accepts one sane meal", () => {
    const checked = validateAnalysis(sane);
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.value.calories).toBe(480);
  });
});

describe("profile unknown truth", () => {
  it("does not invent a person when onboarding is skipped", () => {
    const profile = hydrateProfile({ onboarding_completed: true, details_skipped: true });
    expect(profile.gender).toBeUndefined();
    expect(profile.age).toBeUndefined();
    expect(profile.height_cm).toBeUndefined();
    expect(profile.weight_kg).toBeUndefined();
    expect(profile.activity_level).toBeUndefined();
    expect(profile.goal).toBeUndefined();
    expect(profile.targets).toBeNull();
    expect(calculateNutrition({})).toBeNull();
  });

  it("does not turn null server fields into male, light, or maintain", () => {
    const profile = profileFromServer({
      gender: null,
      age: null,
      height_cm: null,
      weight_kg: null,
      activity_level: null,
      goal: null,
      target_calories: null,
      onboarding_completed: true,
    });
    expect(profile.gender).toBeUndefined();
    expect(profile.age).toBeUndefined();
    expect(profile.activity_level).toBeUndefined();
    expect(profile.goal).toBeUndefined();
    expect(profile.targets).toBeNull();
    expect(profile.gender).not.toBe("male");
    expect(profile.goal).not.toBe("maintain");
  });

  it("calculates targets only when all six fields are real", () => {
    expect(calculateNutrition({
      gender: "female",
      age: 30,
      height_cm: 165,
      weight_kg: 55,
      activity_level: "light",
    })).toBeNull();
    const ready = calculateNutrition({
      gender: "female",
      age: 30,
      height_cm: 165,
      weight_kg: 55,
      activity_level: "light",
      goal: "maintain",
    });
    expect(ready?.calories).toBeGreaterThan(0);
  });
});

describe("edge auth", () => {
  it("rejects a missing bearer before a user client would be created", () => {
    expect(hasUserBearer(null)).toBe(false);
    expect(hasUserBearer("")).toBe(false);
    expect(hasUserBearer("Bearer")).toBe(false);
    expect(hasUserBearer("Bearer token")).toBe(true);
    const guard = readFileSync("supabase/functions/_shared/guard.ts", "utf8");
    const bearerCheck = guard.indexOf("if (!hasUserBearer");
    const clientCall = guard.indexOf("createClient(");
    expect(bearerCheck).toBeGreaterThan(-1);
    expect(clientCall).toBeGreaterThan(bearerCheck);
    expect(guard).toContain("需要登录");
  });

  it("confirms a meal only through the one-shot database function", () => {
    const confirm = readFileSync("supabase/functions/audit-confirm/index.ts", "utf8");
    expect(confirm.indexOf("requireUser")).toBeLessThan(confirm.indexOf("serviceDb"));
    expect(confirm).toContain("consume_analysis_into_meal");
    expect(confirm).toContain("already_consumed");
    expect(confirm).toContain("409");
    const audit = readFileSync("supabase/functions/audit-standalone/index.ts", "utf8");
    expect(audit).not.toContain("Global Dietary Audit System");
    expect(audit).not.toContain("全球膳食审计系统");
  });
});
