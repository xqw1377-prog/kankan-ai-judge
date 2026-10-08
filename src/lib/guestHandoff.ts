import {
  clearGuestLocalData,
  GUEST_SCOPE,
  readHabits,
  readMeals,
  readProfile,
  writeHabits,
  writeMeals,
  writeProfile,
  type StoredHabit,
  type StoredMeal,
  type StoredProfile,
} from "@/lib/localData";

export function hasGuestLocalData(): boolean {
  return readMeals(GUEST_SCOPE).length > 0
    || readHabits(GUEST_SCOPE).length > 0
    || readProfile(GUEST_SCOPE) != null;
}

const UPGRADE_KEY = "kankan_guest_upgrade_handoff";

export interface UpgradeHandoff {
  anonymousUserId: string;
  state: "pending_verification" | "pending_sync" | "adopted";
}

export function readUpgradeHandoff(): UpgradeHandoff | null {
  try {
    const raw = localStorage.getItem(UPGRADE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UpgradeHandoff>;
    if (typeof parsed.anonymousUserId !== "string" || !parsed.anonymousUserId) return null;
    if (parsed.state !== "pending_verification" && parsed.state !== "pending_sync" && parsed.state !== "adopted") return null;
    return { anonymousUserId: parsed.anonymousUserId, state: parsed.state };
  } catch {
    return null;
  }
}

const handoffListeners = new Set<() => void>();

function emitUpgradeHandoff() {
  for (const listener of handoffListeners) listener();
}

export function subscribeUpgradeHandoff(listener: () => void) {
  handoffListeners.add(listener);
  return () => { handoffListeners.delete(listener); };
}

export function upgradeHandoffSnapshot(): string {
  return localStorage.getItem(UPGRADE_KEY) ?? "";
}

function writeUpgradeHandoff(marker: UpgradeHandoff) {
  localStorage.setItem(UPGRADE_KEY, JSON.stringify(marker));
  emitUpgradeHandoff();
}

export function clearUpgradeHandoff() {
  localStorage.removeItem(UPGRADE_KEY);
  emitUpgradeHandoff();
}

/** Remember that this anonymous user is waiting to become permanent. */
export function noteVerificationHandoff(anonymousUserId: string) {
  const current = readUpgradeHandoff();
  if (current?.anonymousUserId === anonymousUserId && (current.state === "adopted" || current.state === "pending_sync")) return;
  writeUpgradeHandoff({ anonymousUserId, state: "pending_verification" });
}

export type VerifiedUpgradeResult =
  | { status: "ignored" }
  | { status: "pending" }
  | { status: "pending_sync"; profile: StoredProfile | null; habits: StoredHabit[] }
  | { status: "adopted"; already: boolean; profile: StoredProfile | null; habits: StoredHabit[] };

function copyGuestOntoAccount(userId: string, options: { includeProfile: boolean; markPending: boolean }): {
  profile: StoredProfile | null;
  meals: StoredMeal[];
  habits: StoredHabit[];
} {
  const profile = options.includeProfile ? readProfile(GUEST_SCOPE) : null;
  const meals = readMeals(GUEST_SCOPE);
  const habits = readHabits(GUEST_SCOPE);
  if (profile && !readProfile(userId)) writeProfile(userId, profile);
  const existingMeals = readMeals(userId);
  const ids = new Set(existingMeals.map((meal) => meal.id));
  const carried = meals
    .filter((meal) => !ids.has(meal.id))
    .map((meal) => options.markPending ? { ...meal, pendingSync: true } : meal);
  if (carried.length) writeMeals(userId, [...carried, ...existingMeals]);
  if (habits.length && readHabits(userId).length === 0) writeHabits(userId, habits);
  return { profile, meals: carried, habits };
}

/** Copies this device's guest log onto an account. Clears the guest source. Claim already succeeded on the server. */
export function adoptGuestLocalData(userId: string, options: { includeProfile: boolean }): {
  profile: StoredProfile | null;
  meals: StoredMeal[];
  habits: StoredHabit[];
} {
  const copied = copyGuestOntoAccount(userId, { includeProfile: options.includeProfile, markPending: false });
  clearGuestLocalData();
  return copied;
}

/**
 * COPY the guest log onto the same user and leave the source in place.
 * State becomes pending_sync. Does not mark adopted.
 */
export function stageVerifiedUpgrade(session: {
  userId: string | null;
  isAnonymous: boolean;
}): VerifiedUpgradeResult {
  const marker = readUpgradeHandoff();
  if (!marker || !session.userId || marker.anonymousUserId !== session.userId) return { status: "ignored" };
  if (marker.state === "adopted") return { status: "adopted", already: true, profile: null, habits: [] };
  if (session.isAnonymous) return { status: "pending" };
  const copied = copyGuestOntoAccount(session.userId, { includeProfile: true, markPending: true });
  writeUpgradeHandoff({ anonymousUserId: session.userId, state: "pending_sync" });
  return {
    status: "pending_sync",
    profile: copied.profile ?? readProfile(session.userId),
    habits: copied.habits,
  };
}

export function finishVerifiedUpgrade(userId: string) {
  writeUpgradeHandoff({ anonymousUserId: userId, state: "adopted" });
  clearGuestLocalData();
}

export function upgradeProfileSaved(data: unknown, error: unknown): boolean {
  const row = data && typeof data === "object" ? (data as { profile?: unknown }).profile : undefined;
  return !error && Boolean(row);
}

/**
 * COPY → save-profile server success → MARK ADOPTED → CLEAR guest source.
 * A failed save keeps pending_sync and the guest source so the next attempt can retry.
 */
export async function commitVerifiedUpgrade(
  session: { userId: string | null; isAnonymous: boolean },
  saveProfile: (profile: StoredProfile) => Promise<boolean>,
): Promise<VerifiedUpgradeResult> {
  const staged = stageVerifiedUpgrade(session);
  if (staged.status !== "pending_sync" || !session.userId) return staged;
  if (staged.profile) {
    const saved = await saveProfile(staged.profile);
    if (!saved) return staged;
  }
  finishVerifiedUpgrade(session.userId);
  return { status: "adopted", already: false, profile: staged.profile, habits: staged.habits };
}
