import { calculateNutrition, type NutritionTargets, type UserProfile } from "@/lib/nutrition";

const GUEST_KEY = "kankan_guest";
export const GUEST_SCOPE = "guest";

function profileKey(scope: string) {
  return `kankan_profile_${scope}`;
}
function mealsKey(scope: string) {
  return `kankan_meals_${scope}`;
}
function habitsKey(scope: string) {
  return `kankan_habits_${scope}`;
}

export interface StoredMeal {
  id: string;
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients: Array<{ name: string; grams: number; protein?: number; fat?: number; carbs?: number; calories?: number; cookMethod?: string }>;
  verdict: string;
  suggestion: string;
  recorded_at: string;
  sequence_score: number | null;
  pendingSync?: boolean;
}

export interface StoredProfile extends UserProfile {
  device_id: string;
  onboarding_completed: boolean;
  /** User skipped sex / age / height / weight / goal. Do not present defaults as facts. */
  details_skipped?: boolean;
  targets: NutritionTargets;
  nickname?: string;
  avatar_url?: string;
  /** Targets were stored by save-profile. Do not recalculate them on this device. */
  targetsFromServer?: boolean;
}

export function markGuestMode() {
  localStorage.setItem(GUEST_KEY, "1");
}

export function isGuestMode() {
  return localStorage.getItem(GUEST_KEY) === "1";
}

export function clearGuestMode() {
  localStorage.removeItem(GUEST_KEY);
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function hydrateProfile(raw: Partial<StoredProfile> & { device_id?: string }): StoredProfile {
  const profileData: UserProfile = {
    gender: raw.gender === "female" ? "female" : "male",
    age: raw.age || 28,
    height_cm: raw.height_cm || 170,
    weight_kg: raw.weight_kg || 65,
    activity_level: raw.activity_level || "light",
    goal: raw.goal || "maintain",
    diet_preference: raw.diet_preference,
    cooking_source: raw.cooking_source,
    allergies: raw.allergies,
  };
  return {
    ...profileData,
    device_id: raw.device_id || "",
    onboarding_completed: raw.onboarding_completed ?? false,
    details_skipped: raw.details_skipped ?? false,
    nickname: raw.nickname,
    avatar_url: raw.avatar_url,
    targets: calculateNutrition(profileData),
  };
}

export function profileFromServer(row: Record<string, unknown>): StoredProfile {
  const calories = Number(row.target_calories);
  const targets = Number.isFinite(calories) && calories > 0
    ? {
      tdee: Number(row.tdee) || 0,
      calories,
      protein_g: Number(row.target_protein_g) || 0,
      fat_g: Number(row.target_fat_g) || 0,
      carbs_g: Number(row.target_carbs_g) || 0,
    }
    : { tdee: 0, calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
  return {
    gender: row.gender === "female" ? "female" : "male",
    age: Number(row.age) || 0,
    height_cm: Number(row.height_cm) || 0,
    weight_kg: Number(row.weight_kg) || 0,
    activity_level: (row.activity_level as StoredProfile["activity_level"]) || "light",
    goal: (row.goal as StoredProfile["goal"]) || "maintain",
    diet_preference: typeof row.diet_preference === "string" ? row.diet_preference : undefined,
    cooking_source: typeof row.cooking_source === "string" ? row.cooking_source : undefined,
    allergies: typeof row.allergies === "string" ? row.allergies : undefined,
    device_id: "",
    onboarding_completed: Boolean(row.onboarding_completed),
    nickname: typeof row.nickname === "string" ? row.nickname : undefined,
    avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : undefined,
    targets,
    targetsFromServer: true,
  };
}

export function readProfile(scope: string): StoredProfile | null {
  const raw = readJson<StoredProfile>(profileKey(scope));
  if (!raw || typeof raw !== "object") return null;
  if (raw.targetsFromServer) return raw;
  return hydrateProfile(raw);
}

export function writeProfile(scope: string, profile: StoredProfile) {
  writeJson(profileKey(scope), profile);
}

export function readMeals(scope: string): StoredMeal[] {
  const raw = readJson<StoredMeal[]>(mealsKey(scope));
  if (!Array.isArray(raw)) return [];
  return raw.filter((meal) => meal && typeof meal.id === "string" && typeof meal.food_name === "string");
}

export function writeMeals(scope: string, meals: StoredMeal[]) {
  writeJson(mealsKey(scope), meals.slice(0, 100));
}

export interface StoredHabit {
  original_name: string;
  corrected_name: string | null;
  corrected_grams: number | null;
  preferred_cook_method: string | null;
  occurrence_count: number;
  auto_apply: boolean;
}

export function readHabits(scope: string): StoredHabit[] {
  const raw = readJson<StoredHabit[]>(habitsKey(scope));
  return Array.isArray(raw) ? raw : [];
}

export function writeHabits(scope: string, habits: StoredHabit[]) {
  writeJson(habitsKey(scope), habits);
}

function mealKey(meal: { food_name: string; recorded_at: string; calories: number }) {
  return `${meal.food_name}|${meal.recorded_at}|${meal.calories}`;
}

/** Keep unsynced local meals that the server does not have yet. */
export function mergeMeals(remote: StoredMeal[], local: StoredMeal[]): StoredMeal[] {
  const remoteKeys = new Set(remote.map(mealKey));
  const pending = local.filter((meal) => meal.pendingSync && !remoteKeys.has(mealKey(meal)));
  return [...pending, ...remote]
    .sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at))
    .slice(0, 100);
}
