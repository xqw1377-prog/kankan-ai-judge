export interface UserProfile {
  gender?: "male" | "female";
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: "sedentary" | "light" | "moderate" | "high" | "extreme";
  goal?: "fat_loss" | "muscle_gain" | "sugar_control" | "maintain";
  diet_preference?: string;
  cooking_source?: string;
  allergies?: string;
}

export interface NutritionTargets {
  tdee: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  extreme: 1.9,
};

const GOAL_ADJUSTMENTS = {
  fat_loss: -500,
  muscle_gain: 300,
  sugar_control: -200,
  maintain: 0,
};

/** Daily targets need activity as well as sex, age, height, weight, and goal. */
export function isProfileComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile?.gender || !profile.age || !profile.height_cm || !profile.weight_kg || !profile.activity_level || !profile.goal) {
    return false;
  }
  return calculateNutrition(profile) != null;
}

export function calculateNutrition(profile: UserProfile): NutritionTargets | null {
  const gender = profile.gender === "male" || profile.gender === "female" ? profile.gender : null;
  const activity = profile.activity_level && profile.activity_level in ACTIVITY_MULTIPLIERS ? profile.activity_level : null;
  const goal = profile.goal && profile.goal in GOAL_ADJUSTMENTS ? profile.goal : null;
  const age = Number(profile.age);
  const height_cm = Number(profile.height_cm);
  const weight_kg = Number(profile.weight_kg);
  if (!gender || !activity || !goal) return null;
  if (!Number.isFinite(age) || age < 10 || age > 100) return null;
  if (!Number.isFinite(height_cm) || height_cm < 100 || height_cm > 230) return null;
  if (!Number.isFinite(weight_kg) || weight_kg < 30 || weight_kg > 250) return null;

  // Mifflin-St Jeor. Called only after the six body fields are real.
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
  const calories = Math.max(1200, tdee + GOAL_ADJUSTMENTS[goal]);

  // Macro split
  const protein_g = Math.round(weight_kg * (goal === "muscle_gain" ? 2.0 : 1.6));
  const fat_g = Math.round((calories * 0.25) / 9);
  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;
  const carbs_g = Math.round((calories - proteinCals - fatCals) / 4);

  return { tdee, calories, protein_g, fat_g, carbs_g };
}

/** 0–100 closeness of today's logged intake to the profile targets. 0 when nothing was logged. */
export function scoreToday(
  totals: { calories: number; protein_g: number; fat_g: number; carbs_g: number },
  targets: { calories: number; protein_g: number; fat_g: number; carbs_g: number },
): number {
  const eaten = totals.calories + totals.protein_g + totals.fat_g + totals.carbs_g;
  if (eaten <= 0) return 0;

  const closeness = (current: number, target: number) => {
    if (target <= 0 || current <= 0) return 0;
    const ratio = current / target;
    if (ratio <= 1) return ratio;
    return Math.max(0, 1 - (ratio - 1));
  };

  const parts = [
    closeness(totals.calories, targets.calories),
    closeness(totals.protein_g, targets.protein_g),
    closeness(totals.fat_g, targets.fat_g),
    closeness(totals.carbs_g, targets.carbs_g),
  ];
  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100);
}

export function getMealTypeByTime(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "snack";
  return "dinner";
}

export function getMealTypeLabel(type: string, locale: string = "zh-CN"): string {
  if (locale.startsWith("en")) {
    const en: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
    return en[type] || type;
  }
  const map: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    snack: "加餐",
  };
  return map[type] || type;
}
