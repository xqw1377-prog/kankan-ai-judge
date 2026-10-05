import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localDayWindow } from "@/lib/serverWrites";

export interface DaySummary {
  score: number | null;
  totals: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
  targets: { calories: number; protein_g: number; fat_g: number; carbs_g: number } | null;
}

/** Local calendar day. A change after midnight refreshes the saved-row summary. */
export function localDayStamp(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** Score and totals come from saved rows. The client does not calculate them. */
export function useDaySummary(userId: string | null, refreshKey = 0) {
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [dayStamp, setDayStamp] = useState(() => localDayStamp());

  useEffect(() => {
    const tick = () => {
      const next = localDayStamp();
      setDayStamp((current) => (current === next ? current : next));
    };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

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
  }, [userId, refreshKey, dayStamp]);

  return summary;
}
