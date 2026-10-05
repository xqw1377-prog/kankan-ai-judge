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
    expect(readMeals(GUEST_SCOPE)).toEqual([]);
    expect(readProfile(GUEST_SCOPE)).toBeNull();
    expect(readHabits(GUEST_SCOPE)).toEqual([]);
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
    expect(readProfile(GUEST_SCOPE)).toBeNull();
  });
});

describe("scan retry key", () => {
  it("hashes the full image payload, not a prefix", async () => {
    const images = ["data:image/jpeg;base64,abc123-full-payload"];
    const same = await scanAttemptKey(images);
    expect(same).toBe(await scanAttemptKey(images));
    expect(same).toHaveLength(64);
    expect(await scanAttemptKey(["data:image/jpeg;base64,abc123-full-payload-other"])).not.toBe(same);
    const head = "data:image/jpeg;base64," + "a".repeat(30);
    const prefixTwin = `${head}one-photo`;
    const otherTwin = `${head}two-photo`;
    expect(prefixTwin.slice(0, 24)).toBe(otherTwin.slice(0, 24));
    expect(prefixTwin.length).toBe(otherTwin.length);
    expect(await scanAttemptKey([prefixTwin])).not.toBe(await scanAttemptKey([otherTwin]));
  });
});

describe("r2b source contracts", () => {
  it("sends the scan key, persists the edited dish, and claims only after auth", () => {
    const scan = readFileSync("src/pages/Scan.tsx", "utf8");
    expect(scan).toContain("idempotencyKey");
    expect(scan).toContain("scanAttemptKey");
    expect(scan).toContain("const idempotencyKey = anonymous ? await scanAttemptKey(images) : null");
    const analyze = readFileSync("supabase/functions/analyze-food/index.ts", "utf8");
    expect(analyze).toContain("persistedIdempotencyKey");
    expect(analyze).toContain("guestRetryDecision");
    expect(analyze).toContain('if (early === "block") return json(403, GUEST_LIMIT_BODY, corsHeaders);');
    expect(analyze).toContain("resolveGuestReservation");
    expect(analyze).toContain("reserveGuestFoodSlot");
    const quota = readFileSync("supabase/functions/_shared/guestFoodQuota.ts", "utf8");
    expect(quota).toContain("recovered: true");
    expect(quota).not.toContain("created_at");
    const editor = readFileSync("src/pages/EditIngredients.tsx", "utf8");
    expect(editor).toContain("useState<CookingMethod | null>(null)");
    expect(editor).toContain("...(cookingMethod ? { cookingMethod } : {})");
    const reinfer = readFileSync("supabase/functions/re-infer-dish/index.ts", "utf8");
    expect(reinfer).toContain("dishName");
    expect(reinfer).toContain("cookingMethod");
    expect(reinfer).toContain("confirmedName");
    const claim = readFileSync("supabase/functions/claim-guest-meal/index.ts", "utf8");
    expect(claim.indexOf("requireUser")).toBeLessThan(claim.indexOf("serviceDb"));
    expect(claim).toContain("issue_guest_claim_token");
    expect(claim).toContain("claim_guest_meals");
    const profile = readFileSync("src/pages/Profile.tsx", "utf8");
    expect(profile).toContain("if (!authReady || !profileReady)");
    expect(profile).toContain("t.myPage");
    expect(profile).toContain("profileMissingPrompt");
    expect(profile).not.toContain("profileSetupTitle");
    for (const name of ["MealSequenceCoach", "InvestmentReport", "DietRing", "DietCreditCard"]) expect(profile).not.toContain(name);
    expect(readFileSync("src/App.tsx", "utf8")).toContain('path="/audit"');
    const privacy = readFileSync("src/pages/Privacy.tsx", "utf8");
    const consent = readFileSync("src/lib/i18n/zh-CN.ts", "utf8");
    for (const text of [privacy, consent]) {
      expect(text).toContain("Lovable AI Gateway");
      expect(text).toContain("Gemini");
      expect(text).toContain("AI 服务");
      expect(text).not.toContain("不会在第三方服务器");
    }
    expect(consent).toContain("本次免费体验已用完，注册后继续记录");
    expect(consent).not.toContain("每台设备");
    expect(consent).not.toContain("终身");
  });
});
