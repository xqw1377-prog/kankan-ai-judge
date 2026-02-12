import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";

export interface MealRecord {
  id: string;
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients: Array<{ name: string; grams: number }>;
  verdict: string;
  suggestion: string;
  recorded_at: string;
}

export function useMeals() {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchMeals = useCallback(async () => {
    const { data } = await supabase
      .from("meal_records")
      .select("*")
      .eq("device_id", deviceId)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (data) {
      const mapped = data.map((m: any) => ({
        ...m,
        ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      })) as MealRecord[];
      setMeals(mapped);

      const today = new Date().toDateString();
      setTodayMeals(mapped.filter(m => new Date(m.recorded_at).toDateString() === today));
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const saveMeal = useCallback(async (meal: Omit<MealRecord, "id" | "recorded_at">) => {
    const { data, error } = await supabase
      .from("meal_records")
      .insert({
        ...meal,
        device_id: deviceId,
      })
      .select()
      .single();

    if (!error) {
      await fetchMeals();
    }
    return { data, error };
  }, [deviceId, fetchMeals]);

  const deleteMeal = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("meal_records")
      .delete()
      .eq("id", id);

    if (!error) {
      await fetchMeals();
    }
    return { error };
  }, [fetchMeals]);

  const updateMeal = useCallback(async (id: string, updates: Partial<MealRecord>) => {
    const { error } = await supabase
      .from("meal_records")
      .update(updates)
      .eq("id", id);

    if (!error) {
      await fetchMeals();
    }
    return { error };
  }, [fetchMeals]);

  const todayTotals = {
    calories: todayMeals.reduce((s, m) => s + m.calories, 0),
    protein_g: todayMeals.reduce((s, m) => s + m.protein_g, 0),
    fat_g: todayMeals.reduce((s, m) => s + m.fat_g, 0),
    carbs_g: todayMeals.reduce((s, m) => s + m.carbs_g, 0),
  };

  return { meals, todayMeals, todayTotals, loading, saveMeal, deleteMeal, updateMeal, refetch: fetchMeals };
}
