import { useNavigate } from "react-router-dom";
import { Camera, Globe } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useI18n } from "@/lib/i18n";
import MealScoreCard from "@/components/history/MealScoreCard";

const History = () => {
  const navigate = useNavigate();
  const { meals, loading } = useMeals();
  const { t, locale, setLocale } = useI18n();

  // Group by date
  const grouped = meals.reduce((acc, meal) => {
    const dateFmt = locale === "zh-CN"
      ? new Date(meal.recorded_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })
      : new Date(meal.recorded_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
    if (!acc[dateFmt]) acc[dateFmt] = [];
    acc[dateFmt].push(meal);
    return acc;
  }, {} as Record<string, typeof meals>);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-card-foreground">{t.navHistory}</h1>
          {meals.length > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tracking-wider">
              {meals.length} {locale === "zh-CN" ? "条记录" : "records"}
            </p>
          )}
        </div>
        <button
          onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass text-[10px] font-bold text-muted-foreground tracking-wider"
        >
          <Globe className="w-3 h-3" />
          {locale === "zh-CN" ? "EN" : "中"}
        </button>
      </header>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-2">
            <Camera className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{t.historyNoMealsYet}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> {t.takePhoto}
          </button>
        </div>
      ) : (
        <div className="px-4 pb-6 space-y-5">
          {Object.entries(grouped).map(([date, dateMeals]) => {
            const dayCal = dateMeals.reduce((s, m) => s + m.calories, 0);
            return (
              <div key={date}>
                {/* Date header with daily summary */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">{date}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/60">
                    {t.historyDailySummary(dateMeals.length, dayCal)}
                  </p>
                </div>
                <div className="space-y-2">
                  {dateMeals.map(meal => (
                    <MealScoreCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
