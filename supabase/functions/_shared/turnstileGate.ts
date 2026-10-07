/**
 * TODO: set TURNSTILE_SECRET_KEY (Cloudflare Turnstile secret) on the Supabase function secrets.
 * Set KANKAN_ENV=production on the public project so a missing secret fails closed.
 * Non-production without a secret is allowed so local functions can run; do not ship that way.
 */
export function turnstileServerDecision(input: {
  secret: string;
  production: boolean;
  token: string;
  verified: boolean | null;
}): "allow" | "unconfigured" | "missing" | "rejected" {
  if (!input.secret) return input.production ? "unconfigured" : "allow";
  if (!input.token) return "missing";
  if (input.verified !== true) return "rejected";
  return "allow";
}
