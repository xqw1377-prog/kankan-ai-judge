import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GUEST_SCOPE, readHabits, writeHabits, type StoredHabit } from "@/lib/localData";
import { useAuthUserId } from "@/hooks/useAuthUser";

export type HabitPattern = StoredHabit;

export function useHabitLearner() {
  const { ready, userId } = useAuthUserId();
  const scope = userId ?? GUEST_SCOPE;
  const [patterns, setPatterns] = useState<HabitPattern[]>([]);
  const loading = !ready;

  const fetchPatterns = useCallback(async () => {
    if (!ready) return;
    const local = readHabits(scope);
    setPatterns(local);
    if (!userId) return;
    const { data, error } = await supabase
      .from("habit_patterns")
      .select("*")
      .eq("user_id", userId);
    if (error || !data) return;
    const remote = data.map((row) => ({
      original_name: row.original_name,
      corrected_name: row.corrected_name,
      corrected_grams: row.corrected_grams,
      preferred_cook_method: row.preferred_cook_method,
      occurrence_count: row.occurrence_count,
      auto_apply: row.auto_apply,
    }));
    writeHabits(scope, remote);
    setPatterns(remote);
  }, [ready, scope, userId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const recordEdit = useCallback(async (
    originalName: string,
    correctedName?: string,
    correctedGrams?: number,
    cookMethod?: string,
  ) => {
    if (!originalName) return;
    const existing = patterns.find((pattern) => pattern.original_name === originalName);
    const nextCount = (existing?.occurrence_count ?? 0) + 1;
    const nextPattern: HabitPattern = {
      original_name: originalName,
      corrected_name: correctedName || existing?.corrected_name || null,
      corrected_grams: correctedGrams ?? existing?.corrected_grams ?? null,
      preferred_cook_method: cookMethod || existing?.preferred_cook_method || null,
      occurrence_count: nextCount,
      auto_apply: nextCount >= 3,
    };
    const next = existing
      ? patterns.map((pattern) => pattern.original_name === originalName ? nextPattern : pattern)
      : [...patterns, nextPattern];
    writeHabits(scope, next);
    setPatterns(next);

    if (!userId) return;

    if (existing) {
      await supabase
        .from("habit_patterns")
        .update({
          corrected_name: nextPattern.corrected_name,
          corrected_grams: nextPattern.corrected_grams,
          preferred_cook_method: nextPattern.preferred_cook_method,
          occurrence_count: nextPattern.occurrence_count,
          auto_apply: nextPattern.auto_apply,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("original_name", originalName);
    } else {
      await supabase.from("habit_patterns").insert({
        user_id: userId,
        original_name: originalName,
        corrected_name: nextPattern.corrected_name,
        corrected_grams: nextPattern.corrected_grams,
        preferred_cook_method: nextPattern.preferred_cook_method,
        occurrence_count: 1,
        auto_apply: false,
      });
    }
  }, [patterns, scope, userId]);

  const applyHabits = useCallback((ingredients: Array<{ name: string; grams: number; [key: string]: unknown }>) => {
    const autoPatterns = patterns.filter((pattern) => pattern.auto_apply);
    if (autoPatterns.length === 0) return { ingredients, applied: [] as string[] };
    const applied: string[] = [];
    const corrected = ingredients.map((ingredient) => {
      const match = autoPatterns.find((pattern) => pattern.original_name === ingredient.name);
      if (!match) return ingredient;
      applied.push(ingredient.name);
      return {
        ...ingredient,
        name: match.corrected_name || ingredient.name,
        grams: match.corrected_grams ?? ingredient.grams,
        cookMethod: match.preferred_cook_method || ingredient.cookMethod || "steam",
      };
    });
    return { ingredients: corrected, applied };
  }, [patterns]);

  const isTrustedMeal = useCallback((ingredients: Array<{ name: string }>) => {
    if (ingredients.length === 0) return false;
    const autoPatterns = patterns.filter((pattern) => pattern.auto_apply);
    return ingredients.every((ingredient) => autoPatterns.some((pattern) => pattern.original_name === ingredient.name));
  }, [patterns]);

  return { patterns, loading, recordEdit, applyHabits, isTrustedMeal, refetch: fetchPatterns };
}
