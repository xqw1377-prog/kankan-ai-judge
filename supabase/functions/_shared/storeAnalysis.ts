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

export interface StoredAnalysis {
  id: string;
  reused: boolean;
}

/** Persists a validated model result. The client does not choose the numbers. */
export async function storeAnalysis(
  userId: string,
  draft: AnalysisDraft,
  meta: AnalysisMeta,
  idempotencyKey?: string | null,
): Promise<StoredAnalysis | null> {
  const checked = validateAnalysis(draft);
  if (!checked.ok) return null;
  const db = serviceDb();
  if (!db) return null;
  const key = idempotencyKey?.trim() || null;
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
    idempotency_key: key,
  }).select("id").single();
  if (!error && data?.id) return { id: String(data.id), reused: false };
  const duplicate = error?.code === "23505" || /duplicate key|meal_analyses_user_idempotency/i.test(error?.message ?? "");
  if (!duplicate || !key) return null;
  const { data: existing } = await db.from("meal_analyses").select("id")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (!existing?.id) return null;
  return { id: String(existing.id), reused: true };
}
