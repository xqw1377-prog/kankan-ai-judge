const CLAIM_TOKEN_KEY = "kankan_guest_claim_token";

export function rememberClaimToken(token: string) {
  sessionStorage.setItem(CLAIM_TOKEN_KEY, token);
}

export function readClaimToken(): string | null {
  return sessionStorage.getItem(CLAIM_TOKEN_KEY);
}

export function forgetClaimToken() {
  sessionStorage.removeItem(CLAIM_TOKEN_KEY);
}

export function claimSucceeded(error: unknown, status: unknown) {
  return !error && status === "claimed";
}

let inflight: Promise<"none" | "claimed" | "failed"> | null = null;

/** One in-flight claim. A failure keeps the token so the home screen can retry. */
export function retryStoredGuestClaim(
  invoke: (token: string) => Promise<{ error: unknown; status: unknown }>,
): Promise<"none" | "claimed" | "failed"> {
  if (inflight) return inflight;
  const token = readClaimToken();
  if (!token) return Promise.resolve("none");
  inflight = (async () => {
    const result = await invoke(token);
    if (claimSucceeded(result.error, result.status)) {
      forgetClaimToken();
      return "claimed" as const;
    }
    return "failed" as const;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
