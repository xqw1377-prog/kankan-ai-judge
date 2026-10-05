import {
  clearGuestMode,
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
  clearGuestMode();
  return { profile, meals: carried, habits };
}
