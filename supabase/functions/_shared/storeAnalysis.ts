import { validateAnalysis } from "./analysisContract.ts";
import { serviceDb } from "./guard.ts";

export interface AnalysisDraft {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients?: unknown;
  verdict?: string;
  suggestion?: string;
}

/** Persists the model result for this user. The client does not choose the numbers. */
export async function storeAnalysis(userId: string, draft: AnalysisDraft): Promise<string | null> {
  const checked = validateAnalysis(draft);
  if (!checked.ok) return null;
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db.from("meal_analyses").insert({
    user_id: userId,
    food_name: checked.value.food,
    calories: checked.value.calories,
    protein_g: checked.value.protein_g,
    fat_g: checked.value.fat_g,
    carbs_g: checked.value.carbs_g,
    ingredients: checked.value.ingredients,
    verdict: checked.value.verdict,
    suggestion: checked.value.suggestion,
  }).select("id").single();
  if (error || !data?.id) return null;
  return String(data.id);
}
