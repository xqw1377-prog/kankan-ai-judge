/** One successful food analysis for an anonymous user. Hourly caps stay separate. */
export const GUEST_FREE_ANALYSES = 1;
export const GUEST_FREE_LIMIT = "GUEST_FREE_LIMIT";
export const GUEST_SUCCESS_KIND = "guest_success";

export type GuestQuotaDecision =
  | { allow: true }
  | { allow: false; status: 403; code: typeof GUEST_FREE_LIMIT };

/**
 * Permanent users are not capped here.
 * An anonymous user may complete this many successful analyses, then must register.
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
