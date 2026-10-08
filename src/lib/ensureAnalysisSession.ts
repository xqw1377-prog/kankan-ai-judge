type SessionLike = { user?: { id?: string; is_anonymous?: boolean } | null } | null;

export type AnalysisSessionUser = { id: string; isAnonymous: boolean };

function userFrom(session: SessionLike): AnalysisSessionUser | null {
  const id = session?.user?.id;
  if (!id) return null;
  return { id, isAnonymous: session?.user?.is_anonymous === true };
}

/**
 * Uses the current session. Signs in anonymously only when there is none.
 * Production must pass captchaReady (a Turnstile token already obtained) before that sign-in.
 * TODO: VITE_TURNSTILE_SITE_KEY. Missing key fails closed in production via anonymousAccessGate.
 */
export async function ensureAnalysisSession(auth: {
  getSession: () => Promise<{ data: { session: SessionLike } }>;
  signInAnonymously: () => Promise<{ data: { session: SessionLike }; error: { message?: string } | null }>;
}, opts?: {
  captchaReady?: boolean;
  onUser?: (user: AnalysisSessionUser) => void;
}): Promise<"ready" | "signin" | "captcha"> {
  const { data } = await auth.getSession();
  const existing = userFrom(data.session);
  if (existing) {
    opts?.onUser?.(existing);
    return "ready";
  }
  if (import.meta.env.PROD && !opts?.captchaReady) return "captcha";
  const signed = await auth.signInAnonymously();
  if (signed.error || !signed.data.session) return "signin";
  const created = userFrom(signed.data.session);
  if (!created) return "signin";
  opts?.onUser?.(created);
  return "ready";
}
