type SessionLike = { user?: { id?: string; is_anonymous?: boolean } | null } | null;

/** AI analysis needs a real signed-in account. No anonymous sign-in. */
export async function ensureAnalysisSession(auth: {
  getSession: () => Promise<{ data: { session: SessionLike } }>;
}): Promise<"ready" | "signin"> {
  const { data } = await auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous === true) return "signin";
  return "ready";
}
