import { useNavigate } from "react-router-dom";
import { Camera, Globe } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n";

const History = () => {
  const navigate = useNavigate();
  const { meals, loading } = useMeals();
  const { t, locale, setLocale } = useI18n();

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
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-card-foreground">{t.navHistory}</h1>
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
          <p className="text-muted-foreground">{t.noRecords}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> {t.takePhoto}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-6 space-y-5">
          {Object.entries(grouped).map(([date, dateMeals]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📅 {date}</p>
              <div className="space-y-2">
                {dateMeals.map(meal => (
                  <button
                    key={meal.id}
                    onClick={() => navigate(`/meal/${meal.id}`)}
                    className="w-full flex items-center justify-between glass rounded-xl px-4 py-3 shadow-card active:scale-[0.98] transition-transform"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm text-card-foreground">{meal.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{meal.calories}kcal</span>
                      <span className="text-muted-foreground ml-1">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
