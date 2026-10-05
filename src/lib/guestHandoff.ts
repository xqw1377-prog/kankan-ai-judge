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
  state: "pending_verification" | "adopted";
}

export function readUpgradeHandoff(): UpgradeHandoff | null {
  try {
    const raw = localStorage.getItem(UPGRADE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UpgradeHandoff>;
    if (typeof parsed.anonymousUserId !== "string" || !parsed.anonymousUserId) return null;
    if (parsed.state !== "pending_verification" && parsed.state !== "adopted") return null;
    return { anonymousUserId: parsed.anonymousUserId, state: parsed.state };
  } catch {
    return null;
  }
}

function writeUpgradeHandoff(marker: UpgradeHandoff) {
  localStorage.setItem(UPGRADE_KEY, JSON.stringify(marker));
}

/** Remember that this anonymous user is waiting to become permanent. */
export function noteVerificationHandoff(anonymousUserId: string) {
  const current = readUpgradeHandoff();
  if (current?.anonymousUserId === anonymousUserId && current.state === "adopted") return;
  writeUpgradeHandoff({ anonymousUserId, state: "pending_verification" });
}

export type VerifiedUpgradeResult =
  | { status: "ignored" }
  | { status: "pending" }
  | { status: "adopted"; already: boolean; profile: StoredProfile | null; habits: StoredHabit[] };

/**
 * After the same anonymous user becomes permanent, copy the local profile and
 * habits once. A different account, or a user still waiting on email, does not.
 */
export function adoptVerifiedUpgrade(session: {
  userId: string | null;
  isAnonymous: boolean;
}): VerifiedUpgradeResult {
  const marker = readUpgradeHandoff();
  if (!marker || !session.userId || marker.anonymousUserId !== session.userId) return { status: "ignored" };
  if (marker.state === "adopted") return { status: "adopted", already: true, profile: null, habits: [] };
  if (session.isAnonymous) return { status: "pending" };
  const carried = adoptGuestLocalData(session.userId, { includeProfile: true });
  writeUpgradeHandoff({ anonymousUserId: session.userId, state: "adopted" });
  return { status: "adopted", already: false, profile: carried.profile, habits: carried.habits };
}

/** Copies this device's guest log onto an account. Does not touch another account's profile unless asked. */
export function adoptGuestLocalData(userId: string, options: { includeProfile: boolean }): {
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
  const carried = meals.filter((meal) => !ids.has(meal.id));
  if (carried.length) writeMeals(userId, [...carried, ...existingMeals]);
  if (habits.length && readHabits(userId).length === 0) writeHabits(userId, habits);
  clearGuestLocalData();
  return { profile, meals: carried, habits };
}
