/**
 * Cloudflare Turnstile env names:
 * - VITE_TURNSTILE_SITE_KEY — public site key, Vite client
 * - TURNSTILE_SECRET_KEY — secret, Supabase edge functions only
 * - KANKAN_ENV=production — edge functions fail closed when the secret is absent
 *
 * VITE_TURNSTILE_SITE_KEY is committed in the root .env (public value).
 * A production build with no site key must not start an anonymous session or the first AI analysis.
 */

export function anonymousAccessGate(input: {
  prod: boolean;
  siteKey: string;
  token: string | null;
  needsAnonymous: boolean;
}): "allow" | "challenge" | "closed" {
  if (!input.needsAnonymous) return "allow";
  const siteKey = input.siteKey.trim();
  if (!siteKey) return input.prod ? "closed" : "allow";
  if (!input.token) return "challenge";
  return "allow";
}

export function readTurnstileSiteKey(): string {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return typeof key === "string" ? key.trim() : "";
}
