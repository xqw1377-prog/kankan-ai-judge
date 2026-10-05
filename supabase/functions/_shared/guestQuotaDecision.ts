/** One successful food analysis for an anonymous user. Hourly caps stay separate. */
export const GUEST_FREE_ANALYSES = 1;
export const GUEST_FREE_LIMIT = "GUEST_FREE_LIMIT";
export const GUEST_SUCCESS_KIND = "guest_success";

export type GuestQuotaDecision =
  | { allow: true }
  | { allow: false; status: 403; code: typeof GUEST_FREE_LIMIT };

/**
 * Permanent users are not capped here.
 * One anonymous session may complete this many successful analyses.
 * This is not a lifetime limit on a person, and it is not tied to a device id.
 */
export function guestQuotaDecision(input: {
  isAnonymous: boolean;
  successfulCount: number;
}): GuestQuotaDecision {
  if (!input.isAnonymous) return { allow: true };
  if (!Number.isFinite(input.successfulCount) || input.successfulCount >= GUEST_FREE_ANALYSES) {
    return { allow: false, status: 403, code: GUEST_FREE_LIMIT };
  }
  return { allow: true };
}

/** A lost response should replay the stored trial result instead of looking like a new denial. */
export function guestRetryDecision(input: {
  isAnonymous: boolean;
  hasStoredAnalysis: boolean;
  quotaAllows: boolean;
}): "analyze" | "replay" | "block" {
  if (!input.isAnonymous) return "analyze";
  if (input.hasStoredAnalysis) return "replay";
  if (!input.quotaAllows) return "block";
  return "analyze";
}

/** Permanent accounts never persist a photo key. Only an anonymous trial does. */
export function persistedIdempotencyKey(isAnonymous: boolean, raw: unknown): string | null {
  if (!isAnonymous || typeof raw !== "string") return null;
  const key = raw.trim().slice(0, 80);
  return key || null;
}

/** After the atomic guest slot insert: one winner analyses, a loser replays only an exact key. */
export function resolveGuestReservation(input: {
  reserved: "reserved" | "reclaimed" | "taken" | "error";
  hasStoredAnalysis: boolean;
}): "analyze" | "replay" | "block" | "unavailable" {
  if (input.reserved === "error") return "unavailable";
  if (input.reserved === "reserved" || input.reserved === "reclaimed") return "analyze";
  const retry = guestRetryDecision({
    isAnonymous: true,
    hasStoredAnalysis: input.hasStoredAnalysis,
    quotaAllows: false,
  });
  return retry === "replay" ? "replay" : "block";
}
