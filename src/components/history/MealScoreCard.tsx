import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { MealRecord } from "@/hooks/useMeals";
import { getMealTypeLabel } from "@/lib/nutrition";
import { getSequenceGrade, getSequenceGradeInfo } from "@/lib/sequenceScore";
import { useI18n } from "@/lib/i18n";

type ScoreGrade = "excellent" | "good" | "fair" | "poor";

function computeBpi(meal: MealRecord): number {
  const raw = 50 + meal.protein_g * 0.6 - meal.carbs_g * 0.15 - meal.fat_g * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getGrade(score: number): ScoreGrade {
  if (score >= 75) return "excellent";
  if (score >= 55) return "good";
  if (score >= 35) return "fair";
  return "poor";
}

const GRADE_CONFIG: Record<ScoreGrade, { color: string; bg: string; border: string; bar: string }> = {
  excellent: {
    color: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--success)/0.08)]",
    border: "border-[hsl(var(--success)/0.2)]",
    bar: "bg-[hsl(var(--success))]",
  },
  good: {
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
    bar: "bg-primary",
  },
  fair: {
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning)/0.08)]",
    border: "border-[hsl(var(--warning)/0.2)]",
    bar: "bg-[hsl(var(--warning))]",
  },
  poor: {
    color: "text-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/20",
    bar: "bg-destructive",
  },
};

interface MealScoreCardProps {
  meal: MealRecord;
}

export default function MealScoreCard({ meal }: MealScoreCardProps) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const isZh = locale === "zh-CN";
  const bpi = computeBpi(meal);
  const grade = getGrade(bpi);
  const cfg = GRADE_CONFIG[grade];

  const gradeLabel = grade === "excellent" ? t.historyScoreExcellent
    : grade === "good" ? t.historyScoreGood
    : grade === "fair" ? t.historyScoreFair
    : t.historyScorePoor;

  const totalMacro = meal.protein_g + meal.fat_g + meal.carbs_g;
  const proteinPct = totalMacro > 0 ? (meal.protein_g / totalMacro) * 100 : 0;
  const fatPct = totalMacro > 0 ? (meal.fat_g / totalMacro) * 100 : 0;
  const carbsPct = totalMacro > 0 ? (meal.carbs_g / totalMacro) * 100 : 0;

  return (
    <button
      onClick={() => navigate(`/meal/${meal.id}`)}
      className="w-full text-left group"
    >
      <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]`}>
        {/* Top row: name + time + score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-card-foreground truncate leading-tight">
              {meal.food_name}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Score badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className={`text-xl font-black font-mono tabular-nums leading-none ${cfg.color}`}>
                {bpi}
              </span>
              <p className={`text-[8px] font-mono mt-0.5 ${cfg.color} opacity-70`}>{gradeLabel}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
          </div>
        </div>

        {/* Macro split bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/50 mb-2">
          <div
            className="h-full bg-[hsl(var(--success))] transition-all duration-700"
            style={{ width: `${proteinPct}%` }}
          />
          <div
            className="h-full bg-[hsl(var(--warning))] transition-all duration-700"
            style={{ width: `${fatPct}%` }}
          />
          <div
            className="h-full bg-[hsl(var(--info))] transition-all duration-700"
            style={{ width: `${carbsPct}%` }}
          />
        </div>

        {/* Macro labels */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
              {t.historyProtein} {Math.round(meal.protein_g)}g
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]" />
              {t.historyFat} {Math.round(meal.fat_g)}g
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--info))]" />
              {t.historyCarbs} {Math.round(meal.carbs_g)}g
            </span>
          </div>
          <span className="text-xs font-bold font-mono tabular-nums text-card-foreground">
            {meal.calories}<span className="text-[8px] text-muted-foreground font-normal ml-0.5">kcal</span>
          </span>
        </div>
      </div>
    </button>
  );
}
