import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

interface Props {
  mealId: string | null;
  foodName: string;
  triggered: boolean;
  delayMs?: number;
  /** Ingredients snapshot for learning */
  ingredients?: Array<{ name: string; grams: number; cookMethod?: string; [key: string]: any }>;
  /** Predicted performance state */
  predictedFeeling?: "great" | "ok" | "crash";
}

type Feeling = "great" | "ok" | "crash";

export default function PostMealAudit({ mealId, foodName, triggered, delayMs, ingredients, predictedFeeling }: Props) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const predicted = predictedFeeling || "ok";
      const isCorrect = predicted === feeling;

      await supabase.from("meal_feedbacks").insert({
        user_id: session.user.id,
        meal_id: mealId,
        food_name: foodName,
        predicted_feeling: predicted,
        actual_feeling: feeling,
        ingredients: ingredients || [],
        prediction_correct: isCorrect,
        damage_adjustment: !isCorrect && feeling === "crash" ? 0.15 : !isCorrect && feeling === "great" ? -0.1 : 0,
      });

      // 2. Update meal verdict with audit tag
      const { data: meal } = await supabase
        .from("meal_records")
        .select("verdict")
        .eq("id", mealId)
        .single();

      const mismatchTag = !isCorrect
        ? feeling === "crash"
          ? ` [⚠️ 预测偏差：预估${predicted === "great" ? "满血" : "正常"}→实际宕机，已上调损耗系数+15%]`
          : feeling === "great" && predicted === "crash"
            ? ` [✅ 预测偏差：预估宕机→实际满血，已下调损耗系数-10%]`
            : ""
        : "";

      const feedbackTag = feeling === "crash"
        ? `[POST-AUDIT: 💤 ${t.postMealCrash} — ${t.postMealNegativeFlag}]${mismatchTag}`
        : feeling === "great"
          ? `[POST-AUDIT: 🚀 ${t.postMealGreat}]${mismatchTag}`
          : `[POST-AUDIT: 😐 ${t.postMealOk}]`;

      const updatedVerdict = meal?.verdict
        ? `${meal.verdict}\n${feedbackTag}`
        : feedbackTag;

      await supabase
        .from("meal_records")
        .update({ verdict: updatedVerdict })
        .eq("id", mealId)
        .eq("user_id", session.user.id);
    } catch (err) {
      console.warn("Post-meal audit save failed:", err);
    }
  }, [mealId, t, foodName, ingredients, predictedFeeling]);

  if (!triggered || submitted) return null;

  return (
    <AlertDialog open={show} onOpenChange={setShow}>
      <AlertDialogContent className="glass border-primary/30 max-w-sm mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-base font-mono">
            📋 审计对账请求
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            老板，<span className="font-bold text-card-foreground">「{foodName}」</span>吃完 2 小时了，
            <br />现在的 CPU 频率如何？
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 mt-2">
          {([
            { key: "great" as Feeling, emoji: "🚀", label: "满血复活", sub: "专注力满格，大脑高频运转", color: "hsl(160, 70%, 45%)", bg: "hsl(160, 70%, 45%, 0.08)" },
            { key: "ok" as Feeling, emoji: "😐", label: "平稳运行", sub: "无异常波动，中等负载", color: "hsl(43, 80%, 52%)", bg: "hsl(43, 80%, 52%, 0.08)" },
            { key: "crash" as Feeling, emoji: "💤", label: "陷入宕机", sub: "犯困、注意力涣散、决策力下降", color: "hsl(0, 72%, 55%)", bg: "hsl(0, 72%, 55%, 0.08)" },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98]"
              style={{ borderColor: `${opt.color}40`, background: opt.bg }}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <div className="text-left">
                <span className="text-sm font-bold" style={{ color: opt.color }}>
                  {opt.label}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-[8px] font-mono text-muted-foreground/40 text-center mt-3">
          🧬 您的反馈将训练个人体质模型，偏差数据自动修正损耗系数
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
