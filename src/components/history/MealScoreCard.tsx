import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { MealRecord } from "@/hooks/useMeals";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n";

interface MealScoreCardProps {
  meal: MealRecord;
}

export default function MealScoreCard({ meal }: MealScoreCardProps) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const totalMacro = meal.protein_g + meal.fat_g + meal.carbs_g;
  const proteinPct = totalMacro > 0 ? (meal.protein_g / totalMacro) * 100 : 0;
  const fatPct = totalMacro > 0 ? (meal.fat_g / totalMacro) * 100 : 0;
  const carbsPct = totalMacro > 0 ? (meal.carbs_g / totalMacro) * 100 : 0;

  return (
    <button
      onClick={() => navigate(`/meal/${meal.id}`)}
      className="w-full text-left group"
    >
      <div className="rounded-xl border border-border bg-card p-3.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]">
        {/* Top row: name + time + score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-card-foreground truncate leading-tight">
              {meal.food_name}
            </p>
            <p className="text-[13px] font-mono text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {getMealTypeLabel(meal.meal_type, locale)} · {new Date(meal.recorded_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Score badge */}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
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
            <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
              {t.historyProtein} {Math.round(meal.protein_g)}g
            </span>
            <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]" />
              {t.historyFat} {Math.round(meal.fat_g)}g
            </span>
            <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--info))]" />
              {t.historyCarbs} {Math.round(meal.carbs_g)}g
            </span>
          </div>
          <span className="text-xs font-bold font-mono tabular-nums text-card-foreground">
            {meal.calories}<span className="text-xs text-muted-foreground font-normal ml-0.5">kcal</span>
          </span>
        </div>
      </div>
    </button>
  );
}
