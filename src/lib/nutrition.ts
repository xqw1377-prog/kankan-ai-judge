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

export function calculateNutrition(profile: UserProfile): NutritionTargets {
  const { gender = "male", age = 28, height_cm = 170, weight_kg = 65, activity_level = "light", goal = "maintain" } = profile;

  // Mifflin-St Jeor
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
  const calories = Math.max(1200, tdee + GOAL_ADJUSTMENTS[goal]);

  // Macro split
  const protein_g = Math.round(weight_kg * (goal === "muscle_gain" ? 2.0 : 1.6));
  const fat_g = Math.round((calories * 0.25) / 9);
  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;
  const carbs_g = Math.round((calories - proteinCals - fatCals) / 4);

  return { tdee, calories, protein_g, fat_g, carbs_g };
}

export function getMealTypeByTime(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "snack";
  return "dinner";
}

export function getMealTypeLabel(type: string): string {
  const map: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    snack: "加餐",
  };
  return map[type] || type;
}
