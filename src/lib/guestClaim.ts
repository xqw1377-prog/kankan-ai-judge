import { adoptGuestLocalData, hasGuestLocalData } from "@/lib/guestHandoff";
import { notifyGuestClaimed } from "@/lib/guestClaimSync";

const CLAIM_TOKEN_KEY = "kankan_guest_claim_token";

export interface PendingGuestClaim {
  token: string;
  intendedOwnerId: string;
}

export function rememberPendingClaim(token: string, intendedOwnerId: string) {
  sessionStorage.setItem(CLAIM_TOKEN_KEY, JSON.stringify({ token, intendedOwnerId }));
}

export function rememberClaimToken(token: string, intendedOwnerId: string) {
  rememberPendingClaim(token, intendedOwnerId);
}

export function readPendingClaim(): PendingGuestClaim | null {
  const raw = sessionStorage.getItem(CLAIM_TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingGuestClaim>;
    if (typeof parsed.token === "string" && parsed.token && typeof parsed.intendedOwnerId === "string" && parsed.intendedOwnerId) {
      return { token: parsed.token, intendedOwnerId: parsed.intendedOwnerId };
    }
  } catch {
    // A leftover unbound token cannot be retried for whichever account signs in next.
  }
  return null;
}

export function readClaimToken(): string | null {
  return readPendingClaim()?.token ?? null;
}

export function forgetPendingClaim() {
  sessionStorage.removeItem(CLAIM_TOKEN_KEY);
}

export function forgetClaimToken() {
  forgetPendingClaim();
}

export function claimSucceeded(error: unknown, status: unknown) {
  return !error && status === "claimed";
}

/** Retry only for the account that was supposed to receive the trial. */
export function applyPendingClaimSession(input: {
  userId: string | null;
  isAnonymous: boolean;
}): "retry" | "clear" | "skip" {
  const pending = readPendingClaim();
  if (!pending) return "skip";
  if (!input.userId || input.isAnonymous) return "skip";
  if (pending.intendedOwnerId !== input.userId) {
    forgetPendingClaim();
    return "clear";
  }
  return "retry";
}

let inflight: Promise<"none" | "claimed" | "failed" | "mismatch" | "denied"> | null = null;

/** One in-flight claim. A failure keeps the token so the intended account can retry. */
export function retryStoredGuestClaim(
  invoke: (token: string) => Promise<{ error: unknown; status: unknown }>,
  currentUserId: string,
): Promise<"none" | "claimed" | "failed" | "mismatch" | "denied"> {
  if (inflight) return inflight;
  const pending = readPendingClaim();
  if (!pending) return Promise.resolve("none");
  if (pending.intendedOwnerId !== currentUserId) return Promise.resolve("mismatch");
  inflight = (async () => {
    const result = await invoke(pending.token);
    if (claimSucceeded(result.error, result.status)) {
      forgetPendingClaim();
      return "claimed" as const;
    }
    if (result.status === "denied") {
      forgetPendingClaim();
      return "denied" as const;
    }
    return "failed" as const;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function acceptClaimedGuestMeals(userId: string) {
  const carried = adoptGuestLocalData(userId, { includeProfile: false });
  notifyGuestClaimed();
  return carried;
}

export type ExistingAccountHandoff =
  | { status: "issue_failed" }
  | { status: "signin_failed"; message: string }
  | { status: "claimed"; userId: string }
  | { status: "claim_failed"; userId: string }
  | { status: "signed_in"; userId: string };

/**
 * Existing-account sign-in. An anonymous session that still has guest data
 * does not continue when a claim token cannot be issued.
 */
export async function handoffExistingAccountSignIn(deps: {
  getSession: () => Promise<{ userId: string | null; isAnonymous: boolean }>;
  issueToken: () => Promise<string | null>;
  signIn: () => Promise<{ userId: string | null; error: string | null }>;
  claim: (token: string) => Promise<{ error: unknown; status: unknown }>;
}): Promise<ExistingAccountHandoff> {
  const before = await deps.getSession();
  let token: string | null = null;
  if (before.isAnonymous) {
    token = await deps.issueToken();
    if (hasGuestLocalData() && !token) return { status: "issue_failed" };
  }
  const signed = await deps.signIn();
  if (signed.error || !signed.userId) return { status: "signin_failed", message: signed.error ?? "" };
  if (before.isAnonymous && token) {
    rememberPendingClaim(token, signed.userId);
    const claimed = await retryStoredGuestClaim(deps.claim, signed.userId);
    if (claimed === "claimed") {
      acceptClaimedGuestMeals(signed.userId);
      return { status: "claimed", userId: signed.userId };
    }
    return { status: "claim_failed", userId: signed.userId };
  }
  if (!before.isAnonymous) adoptGuestLocalData(signed.userId, { includeProfile: false });
  return { status: "signed_in", userId: signed.userId };
}
