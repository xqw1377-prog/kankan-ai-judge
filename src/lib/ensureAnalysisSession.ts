type SessionLike = { user?: { id?: string } | null } | null;

/** Uses the current session. Signs in anonymously only when there is none. */
export async function ensureAnalysisSession(auth: {
  getSession: () => Promise<{ data: { session: SessionLike } }>;
  signInAnonymously: () => Promise<{ data: { session: SessionLike }; error: { message?: string } | null }>;
}): Promise<"ready" | "signin"> {
  const { data } = await auth.getSession();
  if (data.session) return "ready";
  const signed = await auth.signInAnonymously();
  if (signed.error || !signed.data.session) return "signin";
  return "ready";
}
