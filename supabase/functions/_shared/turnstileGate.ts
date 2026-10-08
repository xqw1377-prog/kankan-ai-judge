/**
 * TURNSTILE_SECRET_KEY and KANKAN_ENV=production are set in Lovable Cloud Secrets (2026-10-08).
 * A missing secret fails closed in production, and also when the browser Origin is kankanai.cc.
 * Other non-production origins without a secret are allowed so local functions can run.
 */
export function isKankanPublicOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "kankanai.cc" || host === "www.kankanai.cc";
  } catch {
    return false;
  }
}

export function turnstileServerDecision(input: {
  secret: string;
  production: boolean;
  token: string;
  verified: boolean | null;
  publicOrigin?: boolean;
}): "allow" | "unconfigured" | "missing" | "rejected" {
  const failClosed = input.production || input.publicOrigin === true;
  if (!input.secret) return failClosed ? "unconfigured" : "allow";
  if (!input.token) return "missing";
  if (input.verified !== true) return "rejected";
  return "allow";
}
