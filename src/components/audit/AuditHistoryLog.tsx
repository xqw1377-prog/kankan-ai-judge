import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Utensils, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMeals } from "@/hooks/useMeals";

const computeBpi = (meal: { protein_g: number; fat_g: number; carbs_g: number }) => {
  // Simplified BPI: protein boosts, carbs (as proxy GL) & fat penalize
  const raw = 50 + meal.protein_g * 0.6 + 0 - meal.carbs_g * 0.15 - meal.fat_g * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

const bpiColor = (score: number) => {
  if (score >= 70) return "text-primary";
  if (score >= 45) return "text-yellow-400";
  return "text-destructive";
};

const AuditHistoryLog = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { meals, loading } = useMeals();

  const recentMeals = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return meals
      .filter((m) => new Date(m.recorded_at) >= cutoff)
      .slice(0, 10);
  }, [meals]);

  if (loading || recentMeals.length === 0) return null;

  return (
    <div className="shrink-0 px-4 pb-3 animate-fade-in">
      <div className="glass rounded-xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              {t.auditHistoryLog}
            </span>
          </div>
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors"
          >
            {t.auditViewAll}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-1">
          {recentMeals.map((meal) => {
            const bpi = computeBpi(meal);
            const date = new Date(meal.recorded_at);
            const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
            const foodAbbr = meal.food_name.length > 8 ? meal.food_name.slice(0, 8) + "…" : meal.food_name;

            return (
              <button
                key={meal.id}
                onClick={() => navigate(`/meal/${meal.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/40 transition-colors group text-left"
              >
                <div className="w-7 h-7 rounded-md bg-secondary/60 flex items-center justify-center shrink-0">
                  <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-card-foreground truncate">{foodAbbr}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">{dateStr}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono tabular-nums ${bpiColor(bpi)}`}>{bpi}</p>
                    <p className="text-[8px] font-mono text-muted-foreground/50 tracking-wider">BPI</p>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuditHistoryLog;
