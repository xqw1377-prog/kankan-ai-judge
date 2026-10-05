import { supabase } from "@/integrations/supabase/client";
import type { FoodAnalysis } from "@/lib/foodAnalysis";

/** A saved meal the user is adding another dish to ("同餐再拍"). */
export interface AppendTarget {
  mealId: string;
  food: string;
  ingredients: Array<{ name: string; grams: number }>;
}

export function appendTargetFromMeal(meal: { id: string; food_name: string; ingredients: Array<{ name: string; grams: number }> }): AppendTarget {
  return {
    mealId: meal.id,
    food: meal.food_name,
    ingredients: meal.ingredients.map((i) => ({ name: i.name, grams: Number(i.grams) || 0 })),
  };
}

/**
 * Merge a newly analysed dish into an existing meal.
 * No server merge API exists yet, so the merged meal is re-estimated server-side
 * (re-infer-dish) from the union of both ingredient lists, and the caller replaces
 * the saved meal with that verified analysis. Per-dish breakdown is not kept.
 */
export async function estimateMergedMeal(
  target: AppendTarget,
  added: FoodAnalysis,
  language: string,
): Promise<{ ok: true; result: FoodAnalysis } | { ok: false; reason: "guest" | "failed" }> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session || s.session.user.is_anonymous) return { ok: false, reason: "guest" };
  const ingredients = [...target.ingredients, ...added.ingredients.map((i) => ({ name: i.name, grams: Number(i.grams) || 0 }))]
    .filter((i) => i.name && i.grams > 0);
  if (ingredients.length === 0) return { ok: false, reason: "failed" };
  const dishName = [target.food, added.food].filter(Boolean).join(" + ");
  try {
    const { data, error } = await supabase.functions.invoke("re-infer-dish", {
      body: { ingredients, language, dishName },
    });
    if (error || data?.error || typeof data?.analysis_id !== "string") return { ok: false, reason: "failed" };
    return {
      ok: true,
      result: {
        food: String(data.food || dishName),
        calories: Number(data.calories) || 0,
        protein_g: Number(data.protein_g) || 0,
        fat_g: Number(data.fat_g) || 0,
        carbs_g: Number(data.carbs_g) || 0,
        ingredients,
        verdict: String(data.verdict || ""),
        suggestion: String(data.suggestion || ""),
        analysis_id: data.analysis_id,
      },
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
