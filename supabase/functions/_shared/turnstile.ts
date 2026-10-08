import { json } from "./guard.ts";
import { isKankanPublicOrigin, turnstileServerDecision } from "./turnstileGate.ts";

async function siteverify(secret: string, token: string): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null) as { success?: boolean } | null;
  return data?.success === true;
}

/** Anonymous food analysis only. Returns a response when the caller must stop. */
export async function requireAnonymousTurnstile(
  token: unknown,
  cors: Record<string, string>,
  origin?: string | null,
): Promise<Response | null> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
  const production = Deno.env.get("KANKAN_ENV") === "production";
  const presented = typeof token === "string" ? token.trim() : "";
  let verified: boolean | null = null;
  if (secret && presented) verified = await siteverify(secret, presented);
  const decision = turnstileServerDecision({
    secret,
    production,
    token: presented,
    verified,
    publicOrigin: isKankanPublicOrigin(origin),
  });
  if (decision === "allow") return null;
  const status = decision === "unconfigured" ? 503 : 403;
  return json(status, { error: "请先完成人机验证", code: `turnstile_${decision}` }, cors);
}
