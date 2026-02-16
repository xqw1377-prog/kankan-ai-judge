import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

interface Props {
  /** Meal ID that was just saved */
  mealId: string | null;
  /** Food name for display */
  foodName: string;
  /** Trigger: set to true after "Sign & Archive" */
  triggered: boolean;
  /** Delay in ms before showing dialog (default 120min for prod, shorter for dev) */
  delayMs?: number;
}

type Feeling = "great" | "ok" | "crash";

export default function PostMealAudit({ mealId, foodName, triggered, delayMs }: Props) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // For demo/dev: use 5s delay. Production would be 120 * 60 * 1000
  const delay = delayMs ?? (import.meta.env.DEV ? 5000 : 120 * 60 * 1000);

  useEffect(() => {
    if (!triggered || submitted || !mealId) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [triggered, submitted, mealId, delay]);

  const handleSelect = useCallback(async (feeling: Feeling) => {
    setSubmitted(true);
    setShow(false);

    if (!mealId) return;

    // Store feedback in meal_records verdict field as JSON append
    try {
      const deviceId = getDeviceId();
      // Read current record to append feedback
      const { data: meal } = await supabase
        .from("meal_records")
        .select("verdict")
        .eq("id", mealId)
        .single();

      const feedbackTag = feeling === "crash"
        ? `[POST-AUDIT: 💤 ${t.postMealCrash} — ${t.postMealNegativeFlag}]`
        : feeling === "great"
          ? `[POST-AUDIT: 🚀 ${t.postMealGreat}]`
          : `[POST-AUDIT: 😐 ${t.postMealOk}]`;

      const updatedVerdict = meal?.verdict
        ? `${meal.verdict}\n${feedbackTag}`
        : feedbackTag;

      await supabase
        .from("meal_records")
        .update({ verdict: updatedVerdict })
        .eq("id", mealId);
    } catch (err) {
      console.warn("Post-meal audit save failed:", err);
    }
  }, [mealId, t]);

  if (!triggered || submitted) return null;

  return (
    <AlertDialog open={show} onOpenChange={setShow}>
      <AlertDialogContent className="glass border-primary/30 max-w-sm mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-base font-mono">
            {t.postMealTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed font-mono">
            {t.postMealQuestion(foodName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 mt-2">
          {([
            { key: "great" as Feeling, emoji: "🚀", label: t.postMealGreat, color: "hsl(160, 70%, 45%)", bg: "hsl(160, 70%, 45%, 0.08)" },
            { key: "ok" as Feeling, emoji: "😐", label: t.postMealOk, color: "hsl(43, 80%, 52%)", bg: "hsl(43, 80%, 52%, 0.08)" },
            { key: "crash" as Feeling, emoji: "💤", label: t.postMealCrash, color: "hsl(0, 72%, 55%)", bg: "hsl(0, 72%, 55%, 0.08)" },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98]"
              style={{ borderColor: `${opt.color}40`, background: opt.bg }}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-sm font-mono font-bold" style={{ color: opt.color }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        <p className="text-[9px] font-mono text-muted-foreground/40 text-center mt-3">
          {t.postMealCalibrationNote}
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
