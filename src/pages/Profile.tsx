import { useNavigate } from "react-router-dom";
import { ChevronRight, Award, Calendar, Utensils, Globe } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";
import DietRing from "@/components/DietRing";
import AnimatedScore from "@/components/AnimatedScore";
import { useI18n } from "@/lib/i18n";

function calcHealthScore(
  totalMeals: number, uniqueDays: number,
  t: { levelGold: string; levelGoldDesc: string; levelSilver: string; levelSilverDesc: string; levelBronze: string; levelBronzeDesc: string; levelNewbie: string; levelNewbieDesc: string }
) {
  const base = Math.min(totalMeals * 50, 3000) + uniqueDays * 100;
  const score = Math.min(base, 9999);
  let level: string, levelDesc: string;
  if (score >= 5000) { level = t.levelGold; levelDesc = t.levelGoldDesc; }
  else if (score >= 2000) { level = t.levelSilver; levelDesc = t.levelSilverDesc; }
  else if (score >= 500) { level = t.levelBronze; levelDesc = t.levelBronzeDesc; }
  else { level = t.levelNewbie; levelDesc = t.levelNewbieDesc; }
  return { score, level, levelDesc };
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const uniqueSorted = [...new Set(dates.map(d => new Date(d).toDateString()))]
    .map(d => new Date(d).getTime()).sort((a, b) => b - a);
  let streak = 1;
  const DAY = 86400000;
  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    if (uniqueSorted[i] - uniqueSorted[i + 1] <= DAY * 1.5) streak++; else break;
  }
  return streak;
}

const Profile = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { meals } = useMeals();
  const { t, locale, setLocale } = useI18n();

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t.onboardingTitle1}</p>
        <button onClick={() => navigate("/welcome")} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold">
          {t.welcomeStart}
        </button>
      </div>
    );
  }

  const nickname = profile.gender === "female" ? "小丽" : "小张";
  const genderLabel = profile.gender === "female" ? t.female : t.male;
  const uniqueDays = new Set(meals.map(m => new Date(m.recorded_at).toDateString())).size;
  const streak = calcStreak(meals.map(m => m.recorded_at));
  const { score, level, levelDesc } = calcHealthScore(meals.length, uniqueDays, t);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.myPage}</h1>
        <button
          onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold"
        >
          <Globe className="w-3.5 h-3.5" />
          {locale === "zh-CN" ? "EN" : "中"}
        </button>
      </header>

      <section className="px-5 mb-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">👤</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{nickname}</h2>
              <p className="text-sm text-muted-foreground">
                {profile.age}{t.ageSuffix} · {genderLabel} · {profile.height_cm}cm / {profile.weight_kg}kg
              </p>
              <p className="text-sm text-primary font-semibold mt-0.5">
                {t.goal}：{t.goalLabels[profile.goal || "maintain"]}
              </p>
            </div>
          </div>
          <button onClick={() => navigate("/onboarding")} className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-semibold active:scale-[0.98] transition-all">
            {t.editProfile}
          </button>
        </div>
      </section>

      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.dietRing}</h3>
        <div className="bg-card rounded-2xl p-5 shadow-card flex justify-center">
          <DietRing meals={meals} />
        </div>
      </section>

      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.healthAssets}</h3>
        <div className="bg-card rounded-2xl p-5 shadow-card mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">{t.healthScore}</span>
            </div>
            <AnimatedScore target={score} />
          </div>
          <p className="text-xs text-muted-foreground">
            {level} · {levelDesc}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{streak}</p>
            <p className="text-[10px] text-muted-foreground">{t.consecutiveDays}</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{uniqueDays}</p>
            <p className="text-[10px] text-muted-foreground">{t.recordDays}</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Utensils className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{meals.length}</p>
            <p className="text-[10px] text-muted-foreground">{t.totalMeals}</p>
          </div>
        </div>
      </section>

      <section className="px-5 mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.preferences}</h3>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {[
            { label: t.allergenManagement, info: profile.allergies || t.notSet },
            { label: t.reminderSettings, info: "" },
            { label: t.privacy, info: "" },
          ].map(item => (
            <button key={item.label} className="w-full flex items-center justify-between px-4 py-3.5 text-sm">
              <span className="truncate">{item.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.info && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{item.info}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pb-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.other}</h3>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {[t.helpFeedback, t.aboutUs].map(item => (
            <button key={item} className="w-full flex items-center justify-between px-4 py-3.5 text-sm">
              <span>{item}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Profile;