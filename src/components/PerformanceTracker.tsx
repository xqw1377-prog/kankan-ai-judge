import { useI18n } from "@/lib/i18n";

interface MealPoint {
  food_name?: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  recorded_at?: string;
}

/** Chart of saved meals only. No simulated weight, GL, or random series. */
export default function PerformanceTracker({ meals = [] }: { meals: MealPoint[] }) {
  const { t } = useI18n();
  const points = meals
    .filter((meal) => Number.isFinite(meal.calories))
    .slice()
    .sort((a, b) => {
      const at = a.recorded_at ? +new Date(a.recorded_at) : 0;
      const bt = b.recorded_at ? +new Date(b.recorded_at) : 0;
      return at - bt;
    })
    .slice(-8);

  if (points.length === 0) {
    return (
      <section className="mb-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.performanceTracker}</h3>
        <p className="text-sm text-muted-foreground glass rounded-2xl p-4">{t.chartEmpty}</p>
      </section>
    );
  }

  const maxCal = Math.max(...points.map((point) => point.calories), 1);

  return (
    <section className="mb-5">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.performanceTracker}</h3>
      <div className="glass rounded-2xl p-4 space-y-2">
        {points.map((point, index) => (
          <div key={`${point.recorded_at || index}-${point.food_name || index}`} className="flex items-center gap-2">
            <span className="w-16 truncate text-[11px] text-muted-foreground">{point.food_name || "餐食"}</span>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (point.calories / maxCal) * 100)}%` }} />
            </div>
            <span className="w-14 text-right text-[11px] font-semibold tabular-nums">{Math.round(point.calories)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
