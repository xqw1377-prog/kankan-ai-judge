import { describe, expect, it, vi } from "vitest";
import { ensureAnalysisSession } from "@/lib/ensureAnalysisSession";
import { GUEST_FREE_LIMIT, guestQuotaDecision } from "@/lib/guestQuota";
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

describe("function error body", () => {
  it("reads GUEST_FREE_LIMIT from the response", async () => {
    const context = new Response(JSON.stringify({
      error: "免费体验已用完，注册后继续记录",
      code: GUEST_FREE_LIMIT,
    }), { status: 403 });
    const failure = await readInvokeFailure(null, {
      message: "Edge Function returned a non-2xx status code",
      context,
    });
    expect(failure).toEqual({
      message: "免费体验已用完，注册后继续记录",
      code: GUEST_FREE_LIMIT,
    });
  });
});

describe("analysis session", () => {
  it("does not sign in anonymously when a session already exists", async () => {
    const signInAnonymously = vi.fn();
    const result = await ensureAnalysisSession({
      getSession: async () => ({ data: { session: { user: { id: "already" } } } }),
    });
    expect(result).toBe("ready");
  });

  it("asks for sign-in when there is no session or only an anonymous one", async () => {
    expect(await ensureAnalysisSession({ getSession: async () => ({ data: { session: null } }) })).toBe("signin");
    expect(await ensureAnalysisSession({ getSession: async () => ({ data: { session: { user: { id: "a", is_anonymous: true } } } }) })).toBe("signin");
  });
});
