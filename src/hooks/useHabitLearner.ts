import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";

export interface HabitPattern {
  original_name: string;
  corrected_name: string | null;
  corrected_grams: number | null;
  preferred_cook_method: string | null;
  occurrence_count: number;
  auto_apply: boolean;
}

export function useHabitLearner() {
  const [patterns, setPatterns] = useState<HabitPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchPatterns = useCallback(async () => {
    const { data } = await supabase
      .from("habit_patterns" as any)
      .select("*")
      .eq("device_id", deviceId);

    if (data) {
      setPatterns(data as any as HabitPattern[]);
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  /**
   * Record a user edit. If they've edited the same ingredient 5+ times,
   * auto_apply becomes true and future recognitions will use their preference.
   */
  const recordEdit = useCallback(async (
    originalName: string,
    correctedName?: string,
    correctedGrams?: number,
    cookMethod?: string,
  ) => {
    if (!originalName) return;

    const existing = patterns.find(p => p.original_name === originalName);

    if (existing) {
      const newCount = existing.occurrence_count + 1;
      await (supabase.from("habit_patterns" as any) as any)
        .update({
          corrected_name: correctedName || existing.corrected_name,
          corrected_grams: correctedGrams ?? existing.corrected_grams,
          preferred_cook_method: cookMethod || existing.preferred_cook_method,
          occurrence_count: newCount,
          auto_apply: newCount >= 3,
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", deviceId)
        .eq("original_name", originalName);
    } else {
      await (supabase.from("habit_patterns" as any) as any)
        .insert({
          device_id: deviceId,
          original_name: originalName,
          corrected_name: correctedName || null,
          corrected_grams: correctedGrams ?? null,
          preferred_cook_method: cookMethod || null,
          occurrence_count: 1,
          auto_apply: false,
        });
    }

    await fetchPatterns();
  }, [deviceId, patterns, fetchPatterns]);

  /**
   * Apply learned habits to a list of AI-recognized ingredients.
   * Returns the corrected list with auto-applied preferences.
   */
  const applyHabits = useCallback((ingredients: Array<{ name: string; grams: number; [key: string]: any }>) => {
    const autoPatterns = patterns.filter(p => p.auto_apply);
    if (autoPatterns.length === 0) return { ingredients, applied: [] };

    const applied: string[] = [];
    const corrected = ingredients.map(ing => {
      const match = autoPatterns.find(p => p.original_name === ing.name);
      if (!match) return ing;
      applied.push(ing.name);
      return {
        ...ing,
        name: match.corrected_name || ing.name,
        grams: match.corrected_grams ?? ing.grams,
        cookMethod: match.preferred_cook_method || (ing as any).cookMethod || "steam",
      };
    });

    return { ingredients: corrected, applied };
  }, [patterns]);

  /**
   * Check if a meal qualifies as a "trusted asset" (all ingredients have 5+ positive history)
   */
  const isTrustedMeal = useCallback((ingredients: Array<{ name: string; [key: string]: any }>) => {
    if (ingredients.length === 0) return false;
    const autoPatterns = patterns.filter(p => p.auto_apply);
    return ingredients.every(ing => autoPatterns.some(p => p.original_name === ing.name));
  }, [patterns]);

  return { patterns, loading, recordEdit, applyHabits, isTrustedMeal, refetch: fetchPatterns };
}
