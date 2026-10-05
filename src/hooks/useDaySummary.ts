import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localDayWindow } from "@/lib/serverWrites";

export interface DaySummary {
  score: number | null;
  totals: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
  targets: { calories: number; protein_g: number; fat_g: number; carbs_g: number } | null;
}

/** Score and totals come from saved rows. The client does not calculate them. */
export function useDaySummary(userId: string | null, refreshKey = 0) {
  const [summary, setSummary] = useState<DaySummary | null>(null);

  useEffect(() => {
    if (!userId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("day-summary", { body: localDayWindow() });
      if (cancelled || error || !data || typeof data !== "object" || "error" in data && (data as { error?: string }).error) return;
      const row = data as DaySummary;
      if (!row.totals) return;
      setSummary({
        score: typeof row.score === "number" ? row.score : null,
        totals: row.totals,
        targets: row.targets ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return summary;
}
