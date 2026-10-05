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

export interface AnalysisMeta {
  provider: string;
  model: string;
  uncertainty: string;
}

/** Persists a validated model result. The client does not choose the numbers. */
export async function storeAnalysis(userId: string, draft: AnalysisDraft, meta: AnalysisMeta): Promise<string | null> {
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
    provider: meta.provider,
    model: meta.model,
    validation_status: "passed",
    uncertainty: meta.uncertainty,
  }).select("id").single();
  if (error || !data?.id) return null;
  return String(data.id);
}
