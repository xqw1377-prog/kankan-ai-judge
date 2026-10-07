import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { hasAiConsent, setAiConsent } from "@/components/AiConsentDialog";
import { canShowLogout } from "@/lib/accountSession";
import { commitVerifiedUpgrade, noteVerificationHandoff, readUpgradeHandoff } from "@/lib/guestHandoff";
import {
  GUEST_SCOPE,
  readMeals,
  readProfile,
  writeMeals,
  writeProfile,
  type StoredMeal,
} from "@/lib/localData";
import {
  allowRemoteLocalWrite,
  localWriteGeneration,
  markScopeDeleted,
  resetLocalWriteGuard,
} from "@/lib/mealWriteGuard";
import { calculateNutrition } from "@/lib/nutrition";
import { anonymousAccessGate } from "@/lib/turnstileGate";
import { applyProfileAdvice, avoidanceNote } from "../../supabase/functions/_shared/profileAdvice.ts";
import { turnstileServerDecision } from "../../supabase/functions/_shared/turnstileGate.ts";

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
    recorded_at: "2026-10-07T08:00:00.000Z",
    sequence_score: null,
  };
}

describe("REL-2 consent, deletion, upgrade, logout, turnstile", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLocalWriteGuard();
  });

  it("does not treat a global consent key as consent for a user", () => {
    localStorage.setItem("kankan_ai_consent_version", "2026-10-07");
    localStorage.setItem("kankan_ai_consent", "yes");
    expect(hasAiConsent("anon-1")).toBe(false);
    setAiConsent("anon-1");
    expect(hasAiConsent("anon-1")).toBe(true);
    expect(hasAiConsent("anon-2")).toBe(false);
  });

  it("drops a stale remote meal write after the account is marked deleted", () => {
    const userId = "user-delete";
    writeMeals(userId, [meal("kept", "午饭")]);
    const generation = localWriteGeneration(userId);
    markScopeDeleted(userId);
    localStorage.removeItem(`kankan_meals_${userId}`);
    expect(readMeals(userId)).toEqual([]);
    expect(allowRemoteLocalWrite(userId, generation)).toBe(false);
    expect(writeMeals(userId, [meal("stale", "回流")])).toBe(false);
    expect(readMeals(userId)).toEqual([]);
    expect(writeProfile(userId, {
      device_id: "",
      onboarding_completed: true,
      targets: null,
    })).toBe(false);
    expect(readProfile(userId)).toBeNull();
  });

  it("keeps pending_sync and the guest source when save-profile fails", async () => {
    const anon = "anon-upgrade";
    writeProfile(GUEST_SCOPE, {
      device_id: "",
      onboarding_completed: true,
      details_skipped: true,
      allergies: "花生",
      targets: null,
    });
    writeMeals(GUEST_SCOPE, [meal("g1", "试用午饭")]);
    noteVerificationHandoff(anon);
    const failed = await commitVerifiedUpgrade({ userId: anon, isAnonymous: false }, async () => false);
    expect(failed.status).toBe("pending_sync");
    expect(readUpgradeHandoff()?.state).toBe("pending_sync");
    expect(readProfile(GUEST_SCOPE)?.allergies).toBe("花生");
    expect(readMeals(GUEST_SCOPE)).toHaveLength(1);
    expect(readMeals(anon)[0]?.pendingSync).toBe(true);
    const saved = await commitVerifiedUpgrade({ userId: anon, isAnonymous: false }, async () => true);
    expect(saved.status).toBe("adopted");
    expect(readUpgradeHandoff()?.state).toBe("adopted");
    expect(readProfile(GUEST_SCOPE)).toBeNull();
    expect(readMeals(GUEST_SCOPE)).toEqual([]);
    expect(readProfile(anon)?.allergies).toBe("花生");
  });

  it("hides logout for anonymous users and keeps it for permanent accounts", () => {
    expect(canShowLogout(null)).toBe(false);
    expect(canShowLogout({ is_anonymous: true })).toBe(false);
    expect(canShowLogout({ is_anonymous: false })).toBe(true);
    const profile = readFileSync("src/pages/Profile.tsx", "utf8");
    const logout = profile.indexOf('data-testid="logout-account"');
    expect(profile.lastIndexOf("canShowLogout(authUser)", logout)).toBeGreaterThan(-1);
    expect(profile).toContain("anonTrialActions");
    expect(readFileSync("src/lib/i18n/zh-CN.ts", "utf8")).not.toContain("本地数据不会丢失");
    expect(readFileSync("src/lib/i18n/en-US.ts", "utf8")).not.toContain("local data will be preserved");
  });

  it("fails closed for anonymous access in production when Turnstile is absent", () => {
    expect(anonymousAccessGate({ prod: false, siteKey: "", token: null, needsAnonymous: true })).toBe("allow");
    expect(anonymousAccessGate({ prod: true, siteKey: "", token: null, needsAnonymous: true })).toBe("closed");
    expect(anonymousAccessGate({ prod: true, siteKey: "site", token: null, needsAnonymous: true })).toBe("challenge");
    expect(anonymousAccessGate({ prod: true, siteKey: "site", token: "tok", needsAnonymous: true })).toBe("allow");
    expect(anonymousAccessGate({ prod: true, siteKey: "", token: null, needsAnonymous: false })).toBe("allow");
    expect(turnstileServerDecision({ secret: "", production: true, token: "", verified: null })).toBe("unconfigured");
    expect(turnstileServerDecision({ secret: "", production: false, token: "", verified: null })).toBe("allow");
    expect(turnstileServerDecision({ secret: "sec", production: true, token: "", verified: null })).toBe("missing");
    expect(turnstileServerDecision({ secret: "sec", production: true, token: "tok", verified: false })).toBe("rejected");
    expect(turnstileServerDecision({ secret: "sec", production: true, token: "tok", verified: true })).toBe("allow");
    const session = readFileSync("src/lib/ensureAnalysisSession.ts", "utf8");
    expect(session).toContain('return "captcha"');
    expect(readFileSync("supabase/functions/analyze-food/index.ts", "utf8")).toContain("requireAnonymousTurnstile");
    expect(readFileSync("DEPLOY.md", "utf8")).toContain("VITE_TURNSTILE_SITE_KEY");
    expect(readFileSync("DEPLOY.md", "utf8")).toContain("TURNSTILE_SECRET_KEY");
    expect(readFileSync("DEPLOY.md", "utf8")).toContain("KANKAN_ENV");
  });

  it("personalizes advice after recognition and does not treat name matches as a medical test", () => {
    const note = avoidanceNote("花生", ["花生酱", "米饭"], "zh-CN");
    expect(note).toContain("忌口提醒");
    expect(note).toContain("不是医学过敏原检测");
    const advised = applyProfileAdvice({
      ingredients: [{ name: "花生酱" }],
      suggestion: "可以配菜。",
    }, { goal: "fat_loss", allergies: "花生", diet_preference: null }, "zh-CN");
    expect(advised.suggestion).toContain("可以配菜");
    expect(advised.suggestion).toContain("减重");
    expect(advised.suggestion).toContain("忌口提醒");
    const analyze = readFileSync("supabase/functions/analyze-food/index.ts", "utf8");
    const prompt = analyze.slice(analyze.indexOf("const systemPrompt"), analyze.indexOf("await completeToolCall"));
    expect(prompt).not.toContain("contextStr");
    expect(prompt).not.toContain("activity_level");
    expect(prompt).not.toContain("weight_kg");
    expect(calculateNutrition({
      gender: "female",
      age: 17,
      height_cm: 165,
      weight_kg: 55,
      activity_level: "light",
      goal: "maintain",
    })).toBeNull();
    expect(calculateNutrition({
      gender: "female",
      age: 18,
      height_cm: 165,
      weight_kg: 55,
      activity_level: "light",
      goal: "maintain",
    })?.calories).toBeGreaterThan(0);
    expect(readFileSync("supabase/functions/_shared/nutrition.ts", "utf8")).toContain("age < 18");
    expect(readFileSync("src/pages/Privacy.tsx", "utf8")).toContain("18 岁及以上");
    expect(readFileSync("src/pages/Privacy.tsx", "utf8")).not.toContain("13 岁");
    expect(readFileSync("src/pages/Terms.tsx", "utf8")).toContain("18 岁及以上");
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain('lang="zh-CN"');
    expect(html).toContain("拍一顿，知道怎么吃");
    expect(html).toContain('content="KanKan"');
    expect(html).toContain("https://kankanai.cc/");
    expect(html).toContain("https://kankanai.cc/og-cover.png");
    expect(html).not.toContain("Lovable");
    expect(html).not.toContain("twitter:site");
    const meals = readFileSync("src/hooks/useMeals.ts", "utf8");
    expect(meals).toContain("abortSignal");
    expect(meals).toContain("allowRemoteLocalWrite");
    const deletion = readFileSync("supabase/functions/delete-account/index.ts", "utf8");
    expect(deletion.indexOf("auth.admin.deleteUser(auth.userId)")).toBeLessThan(deletion.indexOf('db.rpc("purge_user_owned_rows"'));
  });
});
