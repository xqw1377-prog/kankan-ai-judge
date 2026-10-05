import { useNavigate } from "react-router-dom";
import { Camera, Globe } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";
import NutritionBar from "@/components/NutritionBar";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useDaySummary } from "@/hooks/useDaySummary";
import { useI18n } from "@/lib/i18n";
import { useAuthUserId } from "@/hooks/useAuthUser";

const Index = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { meals, todayMeals, userId } = useMeals();
  const { ready, isAnonymous } = useAuthUserId();
  const summary = useDaySummary(isAnonymous ? null : userId, todayMeals.length);
  const { t, locale, setLocale } = useI18n();
  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const targets = summary?.targets && summary.targets.calories > 0 ? summary.targets : null;
  const nickname = profile?.nickname || "";
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t.greetingMorning : hour < 14 ? t.greetingNoon : hour < 18 ? t.greetingAfternoon : t.greetingEvening;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}{nickname ? "，" : ""}</p>
            {nickname ? (
              <h1 className="text-xl font-bold text-card-foreground">{nickname}</h1>
            ) : (
              <button onClick={() => navigate("/profile")} className="min-h-11 text-sm text-primary font-semibold">
                {t.nicknamePlaceholder}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
              aria-label={locale === "zh-CN" ? "Switch to English" : "切换到中文"}
              className="flex min-h-11 items-center gap-1 px-3 py-1.5 rounded-full glass text-[13px] font-bold text-muted-foreground tracking-wider"
            >
              <Globe className="w-3 h-3" />
              {locale === "zh-CN" ? "EN" : "中"}
            </button>
            <button onClick={() => navigate("/profile")} aria-label={t.navProfile} className="w-11 h-11 rounded-full glass flex items-center justify-center">
              <span className="text-lg">👤</span>
            </button>
          </div>
        </div>
      </header>

      <section className="px-5 mb-6">
        {todayMeals.length === 0 ? (
          <div className="glass rounded-2xl p-5 shadow-card text-sm text-muted-foreground leading-relaxed">
            {t.todayEmpty}
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">{t.todayProgress}</span>
              <span className="text-sm font-semibold text-card-foreground">{t.mealsLogged(todayMeals.length)}</span>
            </div>
            {targets ? (
              <>
                <NutritionBar label={t.energy} current={summary?.totals.calories ?? 0} target={targets.calories} unit="kcal" />
                <NutritionBar label={t.protein} current={summary?.totals.protein_g ?? 0} target={targets.protein_g} unit="g" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.profileSetupHint}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col items-center mb-6">
        <button
          onClick={() => navigate("/scan")}
          aria-label={t.takePhoto}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-soft active:scale-95 transition-transform bg-primary text-primary-foreground animate-pulse-soft"
        >
          <Camera className="w-8 h-8" />
        </button>
        <p className="text-sm text-muted-foreground mt-3">{t.takePhoto}</p>
      </section>

      <section className="px-5 pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t.recentRecords}</h2>
        {meals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">{t.noRecords}</p>
        ) : (
          <div className="space-y-2">
            {meals.slice(0, 3).map(meal => (
              <button
                key={meal.id}
                onClick={() => navigate(`/meal/${meal.id}`)}
                className="w-full flex items-center justify-between glass rounded-xl px-4 py-3 shadow-card active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm text-card-foreground">{meal.food_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getMealTypeLabel(meal.meal_type, locale)} · {new Date(meal.recorded_at).toLocaleString(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{meal.calories}kcal</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
