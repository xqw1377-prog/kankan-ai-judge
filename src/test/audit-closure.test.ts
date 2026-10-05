import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AI_CONSENT_VERSION, hasAiConsent, revokeAiConsent, setAiConsent } from "@/components/AiConsentDialog";
import { claimSucceeded, forgetClaimToken, readClaimToken, rememberClaimToken, retryStoredGuestClaim } from "@/lib/guestClaim";
import { localDayStamp } from "@/hooks/useDaySummary";

const PRODUCT_FILES = [
  ...readdirSync("src/pages").filter((name) => name.endsWith(".tsx") && name !== "Audit.tsx").map((name) => `src/pages/${name}`),
  "src/components/MealSequenceCoach.tsx",
  "src/components/InvestmentReport.tsx",
  "src/components/DietCreditCard.tsx",
  "src/components/DietRing.tsx",
  "src/components/history/MealScoreCard.tsx",
  "src/components/BottomNav.tsx",
  "src/App.tsx",
];

describe("guest claim recovery", () => {
  it("keeps the token until the server claim succeeds", async () => {
    forgetClaimToken();
    expect(await retryStoredGuestClaim(async () => ({ error: null, status: "claimed" }), "owner-a")).toBe("none");
    rememberClaimToken("tok", "owner-a");
    expect(claimSucceeded(new Error("no"), "claimed")).toBe(false);
    expect(await retryStoredGuestClaim(async () => ({ error: new Error("no"), status: "" }), "owner-a")).toBe("failed");
    expect(readClaimToken()).toBe("tok");
    expect(await retryStoredGuestClaim(async () => ({ error: null, status: "claimed" }), "owner-a")).toBe("claimed");
    expect(readClaimToken()).toBeNull();
  });
});

describe("AI consent version", () => {
  it("re-prompts when the stored version is missing or old, and settings can revoke it", () => {
    localStorage.clear();
    localStorage.setItem("kankan_ai_consent", "yes");
    expect(hasAiConsent()).toBe(false);
    localStorage.setItem("kankan_ai_consent_version", "2020-01-01");
    expect(hasAiConsent()).toBe(false);
    setAiConsent();
    expect(localStorage.getItem("kankan_ai_consent_version")).toBe(AI_CONSENT_VERSION);
    expect(AI_CONSENT_VERSION).toBe("2026-10-06");
    expect(localStorage.getItem("kankan_ai_consent")).toBeNull();
    expect(hasAiConsent()).toBe(true);
    revokeAiConsent();
    expect(hasAiConsent()).toBe(false);
  });
});

describe("day summary date key", () => {
  it("changes when the local calendar day changes", () => {
    expect(localDayStamp(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-5");
    expect(localDayStamp(new Date(2026, 9, 6, 0, 1))).toBe("2026-10-6");
    expect(localDayStamp(new Date(2026, 9, 5, 23, 59))).not.toBe(localDayStamp(new Date(2026, 9, 6, 0, 1)));
  });
});

describe("audit closure source", () => {
  it("centers the app shell and offers a claim retry", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain("max-w-[480px]");
    expect(app).toContain("md:max-w-2xl");
    expect(app).toContain("lg:max-w-3xl");
    expect(app).toContain("useGuestClaimRecovery");
    expect(app).toContain("guestClaimRetry");
    const login = readFileSync("src/pages/Login.tsx", "utf8");
    expect(login).toContain(">KK<");
    expect(login).not.toContain(">K<");
    expect(login).toContain("loginEmailLabel");
    expect(login).toContain("loginPasswordLabel");
    expect(login).toContain("text-base");
    expect(login).toContain("handoffExistingAccountSignIn");
    const profile = readFileSync("src/pages/Profile.tsx", "utf8");
    expect(profile).toContain("revokeAiConsent");
    expect(profile).toContain("aiConsentRevoke");
  });

  it("removes the named experimental reports from home, result and profile", () => {
    const index = readFileSync("src/pages/Index.tsx", "utf8");
    const result = readFileSync("src/pages/Result.tsx", "utf8");
    const profile = readFileSync("src/pages/Profile.tsx", "utf8");
    for (const name of ["BpiGauge", "BrainBattery", "DigestFunnel", "DigestRaceTrack", "GLGauge", "PerformanceStatus", "InvestmentReport", "MealSequenceCoach"]) {
      expect(index).not.toContain(name);
      expect(result).not.toContain(name);
    }
    for (const name of ["MealSequenceCoach", "InvestmentReport", "DietRing", "DietCreditCard"]) expect(profile).not.toContain(name);
  });

  it("keeps product type at the support and interaction floors", () => {
    for (const file of PRODUCT_FILES) {
      expect(readFileSync(file, "utf8")).not.toMatch(/text-\[(?:[1-9]|1[01])px\]/);
    }
  });
});
