import { readFileSync } from "node:fs";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { zhCN } from "@/lib/i18n/zh-CN";
import {
  acceptClaimedGuestMeals,
  applyPendingClaimSession,
  handoffExistingAccountSignIn,
  readPendingClaim,
  rememberPendingClaim,
  retryStoredGuestClaim,
} from "@/lib/guestClaim";
import { notifyGuestClaimed, subscribeGuestClaim } from "@/lib/guestClaimSync";
import {
  commitVerifiedUpgrade,
  noteVerificationHandoff,
  readUpgradeHandoff,
} from "@/lib/guestHandoff";
import { resolveProfileLoad } from "@/hooks/useProfile";
import { useDaySummary } from "@/hooks/useDaySummary";
import { useMeals } from "@/hooks/useMeals";
import { isProfileComplete } from "@/lib/nutrition";
import {
  GUEST_SCOPE,
  hydrateProfile,
  readHabits,
  readMeals,
  readProfile,
  writeHabits,
  writeMeals,
  writeProfile,
  type StoredHabit,
  type StoredMeal,
} from "@/lib/localData";
import Onboarding from "@/pages/Onboarding";

const gate = vi.hoisted(() => ({
  profileReady: false,
  profile: null as null | {
    gender?: "female";
    age?: number;
    onboarding_completed?: boolean;
  },
}));

const invoke = vi.hoisted(() => vi.fn(async () => ({
  data: {
    score: 4,
    totals: { calories: 20, protein_g: 1, fat_g: 1, carbs_g: 1 },
    targets: null,
  },
  error: null,
})));

const limit = vi.hoisted(() => vi.fn(async () => ({
  data: [{
    id: "claimed-meal",
    food_name: "认领午饭",
    meal_type: "lunch",
    calories: 320,
    protein_g: 10,
    fat_g: 8,
    carbs_g: 40,
    ingredients: [],
    verdict: "",
    suggestion: "",
    recorded_at: "2026-10-05T08:00:00.000Z",
    sequence_score: null,
  }],
  error: null,
})));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({ limit }),
        }),
      }),
    }),
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user-1", is_anonymous: false } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}));

vi.mock("@/hooks/useProfile", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useProfile")>("@/hooks/useProfile");
  return {
    ...actual,
    useProfile: () => ({
      profile: gate.profile,
      profileReady: gate.profileReady,
      authReady: true,
      loading: !gate.profileReady,
      saveProfile: vi.fn(),
      userId: "user-1",
    }),
  };
});

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

function habit(name: string): StoredHabit {
  return {
    original_name: name,
    corrected_name: name,
    corrected_grams: 80,
    preferred_cook_method: null,
    occurrence_count: 1,
    auto_apply: false,
  };
}

describe("P0-3 failed claim token issuance", () => {
  it("stops existing-account handoff when claim-token issuance fails and keeps guest data", async () => {
    writeMeals(GUEST_SCOPE, [meal("guest-1", "试用午饭")]);
    const signIn = vi.fn();
    const outcome = await handoffExistingAccountSignIn({
      getSession: async () => ({ userId: "anon-1", isAnonymous: true }),
      issueToken: async () => null,
      signIn,
      claim: async () => ({ error: null, status: "claimed" }),
    });
    expect(outcome.status).toBe("issue_failed");
    expect(signIn).not.toHaveBeenCalled();
    expect(readMeals(GUEST_SCOPE).map((row) => row.food_name)).toEqual(["试用午饭"]);
    expect(readPendingClaim()).toBeNull();
  });
});

describe("P0-4 pending claim owner", () => {
  it("retries a pending claim only for the intended owner and clears it for a different account", async () => {
    rememberPendingClaim("tok-a", "account-a");
    const claim = vi.fn(async () => ({ error: null, status: "claimed" }));
    expect(await retryStoredGuestClaim(claim, "account-b")).toBe("mismatch");
    expect(claim).not.toHaveBeenCalled();
    expect(readPendingClaim()).toEqual({ token: "tok-a", intendedOwnerId: "account-a" });

    expect(applyPendingClaimSession({ userId: null, isAnonymous: false })).toBe("skip");
    expect(readPendingClaim()?.intendedOwnerId).toBe("account-a");
    expect(applyPendingClaimSession({ userId: "account-b", isAnonymous: false })).toBe("clear");
    expect(readPendingClaim()).toBeNull();

    writeMeals(GUEST_SCOPE, [meal("guest-2", "丢失响应")]);
    const refreshed: string[] = [];
    const stop = subscribeGuestClaim(() => refreshed.push("meals"));
    const outcome = await handoffExistingAccountSignIn({
      getSession: async () => ({ userId: "anon-2", isAnonymous: true }),
      issueToken: async () => "tok-issued",
      signIn: async () => ({ userId: "account-a", error: null }),
      claim: async (token) => {
        expect(token).toBe("tok-issued");
        expect(readPendingClaim()?.intendedOwnerId).toBe("account-a");
        return { error: null, status: "claimed" };
      },
    });
    stop();
    expect(outcome).toEqual({ status: "claimed", userId: "account-a" });
    expect(readMeals("account-a").map((row) => row.food_name)).toEqual(["丢失响应"]);
    expect(readMeals(GUEST_SCOPE)).toEqual([]);
    expect(readPendingClaim()).toBeNull();
    expect(refreshed).toEqual(["meals"]);
  });

  it("keeps the guest log when the claim fails after the token is bound", async () => {
    writeMeals(GUEST_SCOPE, [meal("guest-3", "还在本地")]);
    const outcome = await handoffExistingAccountSignIn({
      getSession: async () => ({ userId: "anon-3", isAnonymous: true }),
      issueToken: async () => "tok-fail",
      signIn: async () => ({ userId: "account-a", error: null }),
      claim: async () => ({ error: new Error("lost"), status: "" }),
    });
    expect(outcome.status).toBe("claim_failed");
    expect(readMeals(GUEST_SCOPE).map((row) => row.food_name)).toEqual(["还在本地"]);
    expect(readPendingClaim()).toEqual({ token: "tok-fail", intendedOwnerId: "account-a" });
  });
});

describe("P0-2 lost claim response", () => {
  it("clears a denied replay and accepts the same owner's successful replay", async () => {
    rememberPendingClaim("tok-replay", "account-a");
    expect(await retryStoredGuestClaim(async () => ({ error: new Error("no"), status: "denied" }), "account-a")).toBe("denied");
    expect(readPendingClaim()).toBeNull();
    rememberPendingClaim("tok-replay", "account-a");
    expect(await retryStoredGuestClaim(async () => ({ error: null, status: "claimed" }), "account-a")).toBe("claimed");
    expect(readPendingClaim()).toBeNull();
  });
});

describe("P0-6 verification handoff", () => {
  it("keeps pending_sync and the guest source until save-profile succeeds", async () => {
    const anon = "anon-verify";
    writeProfile(GUEST_SCOPE, {
      device_id: "",
      onboarding_completed: true,
      details_skipped: false,
      gender: "female",
      age: 32,
      height_cm: 165,
      weight_kg: 55,
      activity_level: "light",
      goal: "maintain",
      allergies: "花生",
      targets: null,
    });
    writeHabits(GUEST_SCOPE, [habit("米饭")]);
    noteVerificationHandoff(anon);
    expect(readUpgradeHandoff()).toEqual({ anonymousUserId: anon, state: "pending_verification" });
    expect((await commitVerifiedUpgrade({ userId: anon, isAnonymous: true }, async () => true)).status).toBe("pending");
    expect(readProfile(GUEST_SCOPE)?.allergies).toBe("花生");
    expect(readProfile(anon)).toBeNull();
    expect((await commitVerifiedUpgrade({ userId: "other-account", isAnonymous: false }, async () => true)).status).toBe("ignored");
    expect(readProfile("other-account")).toBeNull();
    expect(readHabits(GUEST_SCOPE)).toHaveLength(1);

    const failed = await commitVerifiedUpgrade({ userId: anon, isAnonymous: false }, async () => false);
    expect(failed.status).toBe("pending_sync");
    expect(readUpgradeHandoff()?.state).toBe("pending_sync");
    expect(readProfile(GUEST_SCOPE)?.allergies).toBe("花生");
    expect(readProfile(anon)?.allergies).toBe("花生");
    expect(readHabits(anon).map((row) => row.original_name)).toEqual(["米饭"]);
    expect(readHabits(GUEST_SCOPE)).toHaveLength(1);

    const first = await commitVerifiedUpgrade({ userId: anon, isAnonymous: false }, async () => true);
    expect(first.status).toBe("adopted");
    if (first.status === "adopted") {
      expect(first.already).toBe(false);
      expect(first.profile?.allergies).toBe("花生");
      expect(first.habits).toHaveLength(1);
    }
    expect(readProfile(anon)?.allergies).toBe("花生");
    expect(readHabits(anon).map((row) => row.original_name)).toEqual(["米饭"]);
    expect(readProfile(GUEST_SCOPE)).toBeNull();
    expect(readUpgradeHandoff()?.state).toBe("adopted");

    writeProfile(GUEST_SCOPE, {
      device_id: "",
      onboarding_completed: true,
      details_skipped: true,
      allergies: "第二次",
      targets: null,
    });
    writeHabits(GUEST_SCOPE, [habit("面条")]);
    const second = await commitVerifiedUpgrade({ userId: anon, isAnonymous: false }, async () => true);
    expect(second).toMatchObject({ status: "adopted", already: true });
    expect(readProfile(anon)?.allergies).toBe("花生");
    expect(readHabits(anon).map((row) => row.original_name)).toEqual(["米饭"]);
    expect(readProfile(GUEST_SCOPE)?.allergies).toBe("第二次");
  });
});

describe("P1 profile and claim refresh", () => {
  it("keeps a cached incomplete profile when the fetch fails", () => {
    const cached = hydrateProfile({
      gender: "male",
      age: 30,
      height_cm: 180,
      weight_kg: 75,
      goal: "maintain",
      onboarding_completed: true,
    });
    expect(cached.targets).toBeNull();
    expect(cached.activity_level).toBeUndefined();
    const failed = resolveProfileLoad(cached, { failed: true, row: null });
    expect(failed.ready).toBe(true);
    expect(failed.profile?.gender).toBe("male");
    expect(failed.profile?.targets).toBeNull();
    expect(resolveProfileLoad(null, { failed: true, row: null })).toEqual({ profile: null, ready: false });
    expect(readFileSync("src/hooks/useProfile.ts", "utf8")).not.toContain("cached?.targetsFromServer && cached.targets ? cached : null");
  });

  it("counts activity level in profile completeness", () => {
    const body = {
      gender: "male" as const,
      age: 30,
      height_cm: 180,
      weight_kg: 75,
      goal: "maintain" as const,
    };
    expect(isProfileComplete(body)).toBe(false);
    expect(isProfileComplete({ ...body, activity_level: "light" })).toBe(true);
    expect(zhCN.profileMissingPrompt).toContain("活动量");
    expect(readFileSync("src/pages/Profile.tsx", "utf8")).toContain("isProfileComplete");
  });

  it("hydrates onboarding after the profile is ready", async () => {
    gate.profileReady = false;
    gate.profile = null;
    const view = render(
      <I18nProvider>
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(screen.getByTestId("onboarding-loading")).toBeInTheDocument();
    expect(screen.queryByText("让我们认识你")).toBeNull();
    gate.profileReady = true;
    gate.profile = { gender: "female", age: 32, onboarding_completed: false };
    view.rerender(
      <I18nProvider>
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(await screen.findByText("让我们认识你")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /女/ }).className).toContain("border-primary");
    expect(screen.queryByTestId("onboarding-loading")).toBeNull();
  });

  it("refetches meals and the day summary after a successful guest claim", async () => {
    invoke.mockClear();
    limit.mockClear();
    const meals = renderHook(() => useMeals());
    const summary = renderHook(() => useDaySummary("user-1"));
    await waitFor(() => expect(limit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    act(() => notifyGuestClaimed());
    await waitFor(() => expect(limit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    meals.unmount();
    summary.unmount();
    expect(acceptClaimedGuestMeals).toBeTypeOf("function");
    expect(readFileSync("src/hooks/useMeals.ts", "utf8")).toContain("subscribeGuestClaim");
    expect(readFileSync("src/hooks/useDaySummary.ts", "utf8")).toContain("subscribeGuestClaim");
    expect(readFileSync("src/lib/guestClaim.ts", "utf8")).toContain("notifyGuestClaimed");
  });
});

describe("P0-1 lease wiring", () => {
  it("stores a guest analysis only with the lease that reserved it", () => {
    const analyze = readFileSync("supabase/functions/analyze-food/index.ts", "utf8");
    expect(analyze).toContain("storeGuestAnalysisWithLease");
    expect(analyze).toContain("reserved.leaseId");
    expect(analyze).toContain("releaseGuestFoodSlot(hold.db, hold.userId, hold.leaseId)");
    expect(analyze).not.toContain("completeGuestFoodSlot");
    const lease = readFileSync("supabase/tests/guest_lease.sql", "utf8");
    expect(lease).toContain("overlapping old request completed a newer lease");
    expect(lease).toContain("overlapping old request released a newer lease");
    expect(lease).toContain("overlapping old request stored against a newer lease");
    const claim = readFileSync("supabase/tests/guest_claim.sql", "utf8");
    expect(claim).toContain("same owner lost-response replay should succeed");
    expect(claim).toContain("different owner should be denied");
    expect(claim).toContain("two anonymous users with the same image hash should both be claimable");
    expect(readFileSync("src/App.tsx", "utf8")).toContain("useVerifiedUpgradeHandoff");
  });
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  gate.profileReady = false;
  gate.profile = null;
});
