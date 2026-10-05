/** Keep in sync with src/lib/nutrition.ts scoreToday / calculateNutrition. */

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  extreme: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  fat_loss: -500,
  muscle_gain: 300,
  sugar_control: -200,
  maintain: 0,
};

export interface BodyInput {
  gender?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  goal?: string | null;
}

export interface Targets {
  tdee: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function targetsFromBody(body: BodyInput): Targets | null {
  const gender = body.gender === "female" ? "female" : body.gender === "male" ? "male" : null;
  const activity = body.activity_level && ACTIVITY_MULTIPLIERS[body.activity_level] ? body.activity_level : null;
  const goal = body.goal && body.goal in GOAL_ADJUSTMENTS ? body.goal : null;
  const age = Number(body.age);
  const height = Number(body.height_cm);
  const weight = Number(body.weight_kg);
  if (!gender || !activity || !goal) return null;
  if (!Number.isFinite(age) || age < 10 || age > 100) return null;
  if (!Number.isFinite(height) || height < 100 || height > 230) return null;
  if (!Number.isFinite(weight) || weight < 30 || weight > 250) return null;

  const bmr = gender === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
  const calories = Math.max(1200, tdee + GOAL_ADJUSTMENTS[goal]);
  const protein_g = Math.round(weight * (goal === "muscle_gain" ? 2.0 : 1.6));
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  return { tdee, calories, protein_g, fat_g, carbs_g };
}

export function scoreFromSaved(
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
