import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeMeals, readMeals, writeMeals, GUEST_SCOPE, type StoredMeal } from "@/lib/localData";
import { useAuthUserId } from "@/hooks/useAuthUser";

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

function todayOf(meals: MealRecord[]) {
  const today = new Date().toDateString();
  return meals.filter((meal) => new Date(meal.recorded_at).toDateString() === today);
}

export function useMeals() {
  const { ready, userId } = useAuthUserId();
  const scope = userId ?? GUEST_SCOPE;
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const loading = !ready;

  const apply = useCallback((stored: StoredMeal[]) => {
    writeMeals(scope, stored);
    setMeals(stored.map(asMeal));
  }, [scope]);

  const fetchMeals = useCallback(async () => {
    if (!ready) return;
    setMeals(readMeals(scope).map(asMeal));
    if (!userId) return;
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
  }, [apply, ready, scope, userId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const saveMeal = useCallback(async (meal: Omit<MealRecord, "id" | "recorded_at">) => {
    const local: StoredMeal = {
      ...meal,
      ingredients: meal.ingredients || [],
      id: crypto.randomUUID(),
      recorded_at: new Date().toISOString(),
      pendingSync: Boolean(userId),
    };
    apply([local, ...readMeals(scope)]);

    if (!userId) return { data: asMeal(local), error: null };

    try {
      const { data, error } = await supabase
        .from("meal_records")
        .insert({
          user_id: userId,
          food_name: meal.food_name,
          meal_type: meal.meal_type,
          calories: meal.calories,
          protein_g: meal.protein_g,
          fat_g: meal.fat_g,
          carbs_g: meal.carbs_g,
          ingredients: meal.ingredients,
          verdict: meal.verdict,
          suggestion: meal.suggestion,
          sequence_score: meal.sequence_score,
        })
        .select()
        .single();
      if (!error && data) {
        const saved = fromRemote(data as Record<string, unknown>);
        apply(readMeals(scope).map((item) => item.id === local.id ? saved : item));
        return { data: asMeal(saved), error: null };
      }
    } catch {
      // The meal stays on this device until a later signed-in sync.
    }
    return { data: asMeal(local), error: null };
  }, [apply, scope, userId]);

  const deleteMeal = useCallback(async (id: string) => {
    apply(readMeals(scope).filter((meal) => meal.id !== id));
    if (userId) {
      try {
        await supabase.from("meal_records").delete().eq("id", id).eq("user_id", userId);
      } catch {
        // Local delete already applied.
      }
    }
    return { error: null };
  }, [apply, scope, userId]);

  const updateMeal = useCallback(async (id: string, updates: Partial<MealRecord>) => {
    apply(readMeals(scope).map((meal) => meal.id === id ? { ...meal, ...updates, pendingSync: Boolean(userId) } : meal));
    if (userId) {
      try {
        await supabase.from("meal_records").update(updates).eq("id", id).eq("user_id", userId);
      } catch {
        // Local update already applied.
      }
    }
    return { error: null };
  }, [apply, scope, userId]);

  const todayMeals = todayOf(meals);
  const todayTotals = {
    calories: todayMeals.reduce((sum, meal) => sum + meal.calories, 0),
    protein_g: todayMeals.reduce((sum, meal) => sum + meal.protein_g, 0),
    fat_g: todayMeals.reduce((sum, meal) => sum + meal.fat_g, 0),
    carbs_g: todayMeals.reduce((sum, meal) => sum + meal.carbs_g, 0),
  };

  return { meals, todayMeals, todayTotals, loading, saveMeal, deleteMeal, updateMeal, refetch: fetchMeals, userId };
}
