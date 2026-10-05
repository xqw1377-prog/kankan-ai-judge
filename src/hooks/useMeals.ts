import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeMeals, readMeals, writeMeals, GUEST_SCOPE, type StoredMeal } from "@/lib/localData";
import { useAuthUserId } from "@/hooks/useAuthUser";
import { getMealTypeByTime } from "@/lib/nutrition";
import { mealConfirmBody, mealDeleteBody, mealReplaceBody } from "@/lib/serverWrites";

export interface MealRecord {
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
}

function asMeal(row: StoredMeal): MealRecord {
  return {
    id: row.id,
    food_name: row.food_name,
    meal_type: row.meal_type,
    calories: Number(row.calories) || 0,
    protein_g: Number(row.protein_g) || 0,
    fat_g: Number(row.fat_g) || 0,
    carbs_g: Number(row.carbs_g) || 0,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    verdict: row.verdict || "",
    suggestion: row.suggestion || "",
    recorded_at: row.recorded_at,
    sequence_score: row.sequence_score ?? null,
  };
}

function fromRemote(row: Record<string, unknown>): StoredMeal {
  return {
    id: String(row.id),
    food_name: String(row.food_name || ""),
    meal_type: String(row.meal_type || "snack"),
    calories: Number(row.calories) || 0,
    protein_g: Number(row.protein_g) || 0,
    fat_g: Number(row.fat_g) || 0,
    carbs_g: Number(row.carbs_g) || 0,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients as StoredMeal["ingredients"] : [],
    verdict: String(row.verdict || ""),
    suggestion: String(row.suggestion || ""),
    recorded_at: String(row.recorded_at || new Date().toISOString()),
    sequence_score: row.sequence_score == null ? null : Number(row.sequence_score),
    pendingSync: false,
  };
}

async function functionFailure(error: unknown, data: unknown): Promise<{ status: number; message: string }> {
  let message = "";
  if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
    message = (data as { error: string }).error;
  }
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : undefined;
  const status = context instanceof Response ? context.status : 0;
  if (!message && context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: unknown };
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Non-JSON function errors stay on the client message.
    }
  }
  if (!message && error && typeof error === "object" && "message" in error) {
    message = String((error as { message?: unknown }).message ?? "");
  }
  return { status, message };
}

function consumedError(status: number, message: string) {
  return status === 409 || message.includes("已经记过");
}

function todayOf(meals: MealRecord[]) {
  const today = new Date().toDateString();
  return meals.filter((meal) => new Date(meal.recorded_at).toDateString() === today);
}

export function useMeals() {
  const { ready, userId, isAnonymous } = useAuthUserId();
  // Keep the on-device guest log. The anonymous user id is still used when saving a scanned meal.
  const scope = userId && !isAnonymous ? userId : GUEST_SCOPE;
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const loading = !ready;

  const apply = useCallback((stored: StoredMeal[]) => {
    writeMeals(scope, stored);
    setMeals(stored.map(asMeal));
  }, [scope]);

  const fetchMeals = useCallback(async () => {
    if (!ready) return;
    setMeals(readMeals(scope).map(asMeal));
    if (!userId || isAnonymous) return;
    try {
      const { data, error } = await supabase
        .from("meal_records")
        .select("*")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(100);
      if (error || !data) return;
      apply(mergeMeals(data.map((row) => fromRemote(row as Record<string, unknown>)), readMeals(scope)));
    } catch {
      // Keep this account's on-device copy.
    }
  }, [apply, isAnonymous, ready, scope, userId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const saveMeal = useCallback(async (analysisId: string) => {
    if (!userId) return { data: null, error: { message: "signin" } };
    if (!analysisId) return { data: null, error: { message: "missing analysis" } };
    try {
      const { data, error } = await supabase.functions.invoke("audit-confirm", {
        body: mealConfirmBody(analysisId, getMealTypeByTime()),
      });
      const meal = data && typeof data === "object" ? (data as { meal?: Record<string, unknown>; error?: string }).meal : undefined;
      const failure = await functionFailure(error, data);
      if (consumedError(failure.status, failure.message)) {
        return { data: null, error: { message: "already_consumed" } };
      }
      if (error || !meal || failure.message) {
        return { data: null, error: error ?? { message: "save failed" } };
      }
      const saved = fromRemote(meal);
      apply([saved, ...readMeals(scope).filter((item) => item.id !== saved.id)]);
      return { data: asMeal(saved), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, [apply, scope, userId]);

  const deleteMeal = useCallback(async (id: string) => {
    if (!userId) {
      apply(readMeals(scope).filter((meal) => meal.id !== id));
      return { error: null };
    }
    try {
      const { error } = await supabase.functions.invoke("audit-confirm", { body: mealDeleteBody(id) });
      if (error) return { error };
      apply(readMeals(scope).filter((meal) => meal.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [apply, scope, userId]);

  const replaceMeal = useCallback(async (mealId: string, analysisId: string) => {
    if (!userId || !analysisId) return { error: { message: "missing analysis" } };
    try {
      const { data, error } = await supabase.functions.invoke("audit-confirm", {
        body: mealReplaceBody(mealId, analysisId),
      });
      const meal = data && typeof data === "object" ? (data as { meal?: Record<string, unknown> }).meal : undefined;
      const failure = await functionFailure(error, data);
      if (consumedError(failure.status, failure.message)) return { error: { message: "already_consumed" } };
      if (error || !meal) return { error: error ?? { message: "save failed" } };
      const saved = fromRemote(meal);
      apply(readMeals(scope).map((item) => item.id === saved.id ? saved : item));
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [apply, scope, userId]);

  const todayMeals = todayOf(meals);
  const todayTotals = {
    calories: todayMeals.reduce((sum, meal) => sum + meal.calories, 0),
    protein_g: todayMeals.reduce((sum, meal) => sum + meal.protein_g, 0),
    fat_g: todayMeals.reduce((sum, meal) => sum + meal.fat_g, 0),
    carbs_g: todayMeals.reduce((sum, meal) => sum + meal.carbs_g, 0),
  };

  return { meals, todayMeals, todayTotals, loading, saveMeal, deleteMeal, replaceMeal, refetch: fetchMeals, userId };
}
