import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adoptGuestLocalData } from "@/lib/guestHandoff";
import {
  GUEST_SCOPE,
  readHabits,
  readMeals,
  readProfile,
  writeHabits,
  writeMeals,
  writeProfile,
  type StoredMeal,
} from "@/lib/localData";
import { scanAttemptKey } from "@/lib/scanAttempt";

function meal(id: string, name: string): StoredMeal {
  return {
    id,
    food_name: name,
    meal_type: "lunch",
    calories: 100,
    protein_g: 1,
    fat_g: 1,
    carbs_g: 1,
    ingredients: [],
    verdict: "",
    suggestion: "",
    recorded_at: "2026-10-05T08:00:00.000Z",
    sequence_score: null,
  };
}

describe("guest handoff", () => {
  it("keeps guest meals off an account until adopt, and skips the profile unless asked", () => {
    writeMeals(GUEST_SCOPE, [meal("guest-1", "试用午饭")]);
    writeProfile(GUEST_SCOPE, {
      device_id: "",
      onboarding_completed: true,
      details_skipped: true,
      allergies: "花生",
      targets: null,
    });
    writeHabits(GUEST_SCOPE, [{
      original_name: "米饭",
      corrected_name: "杂粮饭",
      corrected_grams: 80,
      preferred_cook_method: null,
      occurrence_count: 1,
      auto_apply: false,
    }]);
    const account = "existing-account";
    writeMeals(account, []);
    expect(readMeals(account)).toEqual([]);

    const carried = adoptGuestLocalData(account, { includeProfile: false });
    expect(carried.meals.map((row) => row.food_name)).toEqual(["试用午饭"]);
    expect(readMeals(account).map((row) => row.food_name)).toEqual(["试用午饭"]);
    expect(readProfile(account)).toBeNull();
    expect(readHabits(account).map((row) => row.corrected_name)).toEqual(["杂粮饭"]);
  });

  it("copies the local guest profile when the same anonymous user upgrades", () => {
    writeProfile(GUEST_SCOPE, {
      device_id: "",
      onboarding_completed: true,
      details_skipped: true,
      allergies: "花生",
      targets: null,
    });
    const account = "upgraded-anon";
    const carried = adoptGuestLocalData(account, { includeProfile: true });
    expect(carried.profile?.allergies).toBe("花生");
    expect(readProfile(account)?.allergies).toBe("花生");
    expect(readProfile(account)?.gender).toBeUndefined();
    expect(readProfile(account)?.goal).toBeUndefined();
  });
});

describe("scan retry key", () => {
  it("reuses one idempotency key for the same photos", () => {
    const images = ["data:image/jpeg;base64,abc123"];
    expect(scanAttemptKey(images)).toBe(scanAttemptKey(images));
    expect(scanAttemptKey(["other"])).not.toBe(scanAttemptKey(images));
  });
});

describe("r2b source contracts", () => {
  it("sends the scan key, persists the edited dish, and claims only after auth", () => {
    const scan = readFileSync("src/pages/Scan.tsx", "utf8");
    expect(scan).toContain("idempotencyKey");
    expect(scan).toContain("scanAttemptKey");
    const analyze = readFileSync("supabase/functions/analyze-food/index.ts", "utf8");
    expect(analyze).toContain("replayGuestAnalysis");
    expect(readFileSync("supabase/functions/_shared/guestFoodQuota.ts", "utf8")).toContain("recovered: true");
    const reinfer = readFileSync("supabase/functions/re-infer-dish/index.ts", "utf8");
    expect(reinfer).toContain("dishName");
    expect(reinfer).toContain("cookingMethod");
    expect(reinfer).toContain("confirmedName");
    const claim = readFileSync("supabase/functions/claim-guest-meal/index.ts", "utf8");
    expect(claim.indexOf("requireUser")).toBeLessThan(claim.indexOf("serviceDb"));
    expect(claim).toContain("issue_guest_claim_token");
    expect(claim).toContain("claim_guest_meals");
    const profile = readFileSync("src/pages/Profile.tsx", "utf8");
    expect(profile.indexOf("if (!authReady || !profileReady)")).toBeLessThan(profile.indexOf("profileSetupTitle"));
    expect(readFileSync("src/App.tsx", "utf8")).toContain('path="/audit"');
    const privacy = readFileSync("src/pages/Privacy.tsx", "utf8");
    const consent = readFileSync("src/lib/i18n/zh-CN.ts", "utf8");
    for (const text of [privacy, consent]) {
      expect(text).toContain("Lovable AI Gateway");
      expect(text).toContain("Gemini");
      expect(text).toContain("数据保留和处理方式以实际使用的 AI 服务提供方及其服务条款为准；我们仅传输完成分析所需的数据，并尽量减少传输内容。");
      expect(text).not.toContain("不会在第三方服务器");
    }
    expect(consent).toContain("每台设备的一次试用已用完，注册后继续记录");
    expect(consent).not.toContain("终身");
  });
});
