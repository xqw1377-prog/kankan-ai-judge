import { describe, expect, it, vi } from "vitest";
import { ensureAnalysisSession } from "@/lib/ensureAnalysisSession";
import { GUEST_FREE_LIMIT, guestQuotaDecision, guestRetryDecision } from "@/lib/guestQuota";
import { readInvokeFailure } from "@/lib/invokeFailure";

describe("guest food quota", () => {
  it("allows a permanent user any number of successes", () => {
    expect(guestQuotaDecision({ isAnonymous: false, successfulCount: 0 })).toEqual({ allow: true });
    expect(guestQuotaDecision({ isAnonymous: false, successfulCount: 4 })).toEqual({ allow: true });
  });

  it("allows an anonymous user one success and then returns GUEST_FREE_LIMIT", () => {
    expect(guestQuotaDecision({ isAnonymous: true, successfulCount: 0 })).toEqual({ allow: true });
    expect(guestQuotaDecision({ isAnonymous: true, successfulCount: 1 })).toEqual({
      allow: false,
      status: 403,
      code: GUEST_FREE_LIMIT,
    });
    expect(guestQuotaDecision({ isAnonymous: true, successfulCount: 2 }).allow).toBe(false);
  });

  it("fails closed when the success count is not a number", () => {
    expect(guestQuotaDecision({ isAnonymous: true, successfulCount: Number.NaN })).toEqual({
      allow: false,
      status: 403,
      code: GUEST_FREE_LIMIT,
    });
  });
});

describe("lost guest response", () => {
  it("replays a stored anonymous analysis instead of blocking the retry", () => {
    expect(guestRetryDecision({ isAnonymous: false, hasStoredAnalysis: true, quotaAllows: false })).toBe("analyze");
    expect(guestRetryDecision({ isAnonymous: true, hasStoredAnalysis: true, quotaAllows: false })).toBe("replay");
    expect(guestRetryDecision({ isAnonymous: true, hasStoredAnalysis: false, quotaAllows: false })).toBe("block");
    expect(guestRetryDecision({ isAnonymous: true, hasStoredAnalysis: false, quotaAllows: true })).toBe("analyze");
  });
});

describe("function error body", () => {
  it("reads GUEST_FREE_LIMIT from the response", async () => {
    const context = new Response(JSON.stringify({
      error: "每台设备的一次试用已用完，注册后继续记录",
      code: GUEST_FREE_LIMIT,
    }), { status: 403 });
    const failure = await readInvokeFailure(null, {
      message: "Edge Function returned a non-2xx status code",
      context,
    });
    expect(failure).toEqual({
      message: "每台设备的一次试用已用完，注册后继续记录",
      code: GUEST_FREE_LIMIT,
    });
  });
});

describe("analysis session", () => {
  it("does not sign in anonymously when a session already exists", async () => {
    const signInAnonymously = vi.fn();
    const result = await ensureAnalysisSession({
      getSession: async () => ({ data: { session: { user: { id: "already" } } } }),
      signInAnonymously,
    });
    expect(result).toBe("ready");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously only when there is no session", async () => {
    const signInAnonymously = vi.fn(async () => ({
      data: { session: { user: { id: "anon" } } },
      error: null,
    }));
    const result = await ensureAnalysisSession({
      getSession: async () => ({ data: { session: null } }),
      signInAnonymously,
    });
    expect(result).toBe("ready");
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it("asks for sign-in when anonymous sign-in fails", async () => {
    const result = await ensureAnalysisSession({
      getSession: async () => ({ data: { session: null } }),
      signInAnonymously: async () => ({ data: { session: null }, error: { message: "disabled" } }),
    });
    expect(result).toBe("signin");
  });
});
