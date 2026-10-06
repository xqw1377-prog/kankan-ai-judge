import { noteVerificationHandoff } from "@/lib/guestHandoff";

const PASSWORD_SETUP_KEY = "kankan_upgrade_password_setup";

/** Where the verification email should return. Must be on the Supabase redirect allow list. */
export function upgradeEmailRedirect(origin: string): string {
  return `${origin.replace(/\/$/, "")}/login`;
}

export function markPasswordSetupPending(userId: string) {
  localStorage.setItem(PASSWORD_SETUP_KEY, JSON.stringify({ userId }));
}

export function readPasswordSetupPending(): { userId: string } | null {
  try {
    const raw = localStorage.getItem(PASSWORD_SETUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: unknown };
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export function clearPasswordSetupPending() {
  localStorage.removeItem(PASSWORD_SETUP_KEY);
}

/** The verified user still needs a password. The password itself is never stored. */
export function needsPasswordSetup(session: { userId: string | null; isAnonymous: boolean }): boolean {
  const marker = readPasswordSetupPending();
  if (!marker || !session.userId || session.isAnonymous) return false;
  return marker.userId === session.userId;
}

export type EmailUpgradeResult =
  | { status: "verification_sent" }
  | { status: "ready_for_password" }
  | { status: "rejected" }
  | { status: "error"; message: string };

/**
 * Anonymous → email. Sends only the email. The password is collected after verification.
 * https://supabase.com/docs/guides/auth/auth-anonymous
 */
export async function requestAnonymousEmailUpgrade(input: {
  email: string;
  redirectTo: string;
  anonymousUserId: string;
  updateEmail: (email: string, redirectTo: string) => Promise<{
    userId: string | null;
    isAnonymous: boolean;
    error: string | null;
  }>;
}): Promise<EmailUpgradeResult> {
  const email = input.email.trim();
  if (!email) return { status: "error", message: "missing email" };
  const result = await input.updateEmail(email, input.redirectTo);
  if (result.error) return { status: "error", message: result.error };
  if (!result.userId || result.userId !== input.anonymousUserId) return { status: "rejected" };
  noteVerificationHandoff(result.userId);
  markPasswordSetupPending(result.userId);
  if (result.isAnonymous) return { status: "verification_sent" };
  return { status: "ready_for_password" };
}

export async function submitUpgradePassword(input: {
  password: string;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}): Promise<{ status: "saved" } | { status: "too_short" } | { status: "error"; message: string }> {
  if (input.password.length < 6) return { status: "too_short" };
  const result = await input.updatePassword(input.password);
  if (result.error) return { status: "error", message: result.error };
  clearPasswordSetupPending();
  return { status: "saved" };
}
