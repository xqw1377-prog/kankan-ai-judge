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
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db.from("meal_analyses").insert({
    user_id: userId,
    food_name: draft.food,
    calories: Math.round(draft.calories),
    protein_g: draft.protein_g,
    fat_g: draft.fat_g,
    carbs_g: draft.carbs_g,
    ingredients: Array.isArray(draft.ingredients) ? draft.ingredients : [],
    verdict: draft.verdict ?? "",
    suggestion: draft.suggestion ?? "",
  }).select("id").single();
  if (error || !data?.id) return null;
  return String(data.id);
}
