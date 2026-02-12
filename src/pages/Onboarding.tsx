import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";
import type { UserProfile } from "@/lib/nutrition";

const Onboarding = () => {
  const navigate = useNavigate();
  const { profile, saveProfile } = useProfile();
  const { t } = useI18n();
  const isEditing = !!profile?.onboarding_completed;

  const ACTIVITY_OPTIONS = [
    { value: "sedentary", emoji: "🪑", label: t.activitySedentary, desc: t.activitySedentaryDesc },
    { value: "light", emoji: "🚶", label: t.activityLight, desc: t.activityLightDesc },
    { value: "moderate", emoji: "🏃", label: t.activityModerate, desc: t.activityModerateDesc },
    { value: "high", emoji: "🏋️", label: t.activityHigh, desc: t.activityHighDesc },
    { value: "extreme", emoji: "💼", label: t.activityExtreme, desc: t.activityExtremeDesc },
  ];

  const GOAL_OPTIONS = [
    { value: "fat_loss", emoji: "🔥", label: t.goalFatLoss, desc: t.goalFatLossDesc },
    { value: "muscle_gain", emoji: "💪", label: t.goalMuscleGain, desc: t.goalMuscleGainDesc },
    { value: "sugar_control", emoji: "🍬", label: t.goalSugarControl, desc: t.goalSugarControlDesc },
    { value: "maintain", emoji: "😊", label: t.goalMaintain, desc: t.goalMaintainDesc },
  ];

  const DIET_OPTIONS = [t.dietOily, t.dietSweet, t.dietMeat, t.dietVeg];
  const COOKING_OPTIONS = [t.cookSelf, t.cookCanteen, t.cookFamily];

  const [step, setStep] = useState(0);
  const [data, setData] = useState<UserProfile>({
    gender: profile?.gender || undefined,
    age: profile?.age || 28,
    height_cm: profile?.height_cm || 170,
    weight_kg: profile?.weight_kg || 65,
    activity_level: profile?.activity_level || undefined,
    goal: profile?.goal || undefined,
    diet_preference: profile?.diet_preference || undefined,
    cooking_source: profile?.cooking_source || undefined,
    allergies: profile?.allergies || "",
  });

  const update = (partial: Partial<UserProfile>) => setData(prev => ({ ...prev, ...partial }));
  const handleNext = () => { if (step < 4) setStep(step + 1); };
  const handleFinish = async () => { await saveProfile({ ...data, onboarding_completed: true }); navigate("/", { replace: true }); };
  const handleSkip = async () => {
    if (isEditing) { navigate(-1); }
    else { await saveProfile({ onboarding_completed: true }); navigate("/", { replace: true }); }
  };
  const canNext = () => {
    if (step === 0) return !!data.gender;
    if (step === 2) return !!data.activity_level;
    if (step === 3) return !!data.goal;
    return true;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="p-2 text-card-foreground"><ChevronLeft className="w-5 h-5" /></button>
        ) : isEditing ? (
          <button onClick={() => navigate(-1)} className="p-2 text-card-foreground"><ChevronLeft className="w-5 h-5" /></button>
        ) : <div className="w-9" />}
        {!isEditing && step <= 3 && <button onClick={handleSkip} className="text-sm text-muted-foreground px-3 py-1">{t.skip}</button>}
        {isEditing && <button onClick={handleSkip} className="text-sm text-muted-foreground px-3 py-1">{t.cancel}</button>}
      </header>

      <div className="flex gap-1.5 px-6 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i <= step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-6">
        {step === 0 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-8 text-card-foreground">{isEditing ? t.onboardingTitle1Edit : t.onboardingTitle1}</h2>
            <div className="flex gap-4 justify-center mb-8">
              {(["male", "female"] as const).map(g => (
                <button key={g} onClick={() => update({ gender: g, height_cm: data.height_cm || (g === "female" ? 160 : 170), weight_kg: data.weight_kg || (g === "female" ? 55 : 65) })}
                  className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${data.gender === g ? "border-primary bg-primary/10" : "border-border glass"}`}>
                  <span className="text-3xl">{g === "male" ? "♂" : "♀"}</span>
                  <span className="font-semibold text-card-foreground">{g === "male" ? t.male : t.female}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{t.age}</label>
              <div className="flex items-center gap-4">
                <input type="range" min={18} max={80} value={data.age || 28} onChange={e => update({ age: Number(e.target.value) })} className="flex-1 accent-[hsl(43,72%,52%)]" />
                <span className="text-lg font-bold w-16 text-center text-card-foreground">{data.age} {t.ageSuffix}</span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-8 text-card-foreground">{t.onboardingTitle2}</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t.height}</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={140} max={210} value={data.height_cm || 170} onChange={e => update({ height_cm: Number(e.target.value) })} className="flex-1 accent-[hsl(43,72%,52%)]" />
                  <span className="text-lg font-bold w-20 text-center text-card-foreground">{data.height_cm} cm</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t.weight}</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={30} max={150} value={data.weight_kg || 65} onChange={e => update({ weight_kg: Number(e.target.value) })} className="flex-1 accent-[hsl(43,72%,52%)]" />
                  <span className="text-lg font-bold w-20 text-center text-card-foreground">{data.weight_kg} kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-card-foreground">{t.onboardingTitle3}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
              {ACTIVITY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => update({ activity_level: opt.value as any })}
                  className={`shrink-0 w-20 py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${data.activity_level === opt.value ? "border-primary bg-primary/10" : "border-border glass"}`}>
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-semibold text-card-foreground">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-card-foreground">{t.onboardingTitle4}</h2>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => update({ goal: opt.value as any })}
                  className={`py-6 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${data.goal === opt.value ? "border-primary bg-primary/10" : "border-border glass"}`}>
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="font-bold text-card-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-card-foreground">{t.onboardingTitle5}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t.onboardingTitle5Desc}</p>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-2 text-card-foreground">{t.dietPreference}</p>
                <div className="flex flex-wrap gap-2">
                  {DIET_OPTIONS.map(d => (
                    <button key={d} onClick={() => update({ diet_preference: data.diet_preference === d ? undefined : d })}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${data.diet_preference === d ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-card-foreground"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-card-foreground">{t.whoCooked}</p>
                <div className="flex flex-wrap gap-2">
                  {COOKING_OPTIONS.map(c => (
                    <button key={c} onClick={() => update({ cooking_source: data.cooking_source === c ? undefined : c })}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${data.cooking_source === c ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-card-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-card-foreground">{t.allergyLabel}</p>
                <input type="text" placeholder={t.allergyPlaceholder} value={data.allergies || ""} onChange={e => update({ allergies: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border glass text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0">
        {step < 4 ? (
          <button onClick={handleNext} disabled={!canNext()}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-all">
            {t.nextStep}
          </button>
        ) : (
          <div className="flex gap-3">
            {!isEditing && (
              <button onClick={handleSkip} className="flex-1 py-4 rounded-2xl border border-border glass font-bold active:scale-[0.98] transition-all text-card-foreground">
                {t.skip}
              </button>
            )}
            <button onClick={handleFinish} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all">
              {isEditing ? t.save : t.done}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
