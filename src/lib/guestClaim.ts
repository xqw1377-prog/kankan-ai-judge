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
