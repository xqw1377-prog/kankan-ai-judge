import { useState, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { ChevronRight, Award, Calendar, Utensils, Globe, Camera, X, Check, LogOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { User } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";
import DietRing from "@/components/DietRing";
import AnimatedScore from "@/components/AnimatedScore";
import DietCreditCard from "@/components/DietCreditCard";
import InvestmentReport from "@/components/InvestmentReport";
import MealSequenceCoach from "@/components/MealSequenceCoach";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useDaySummary } from "@/hooks/useDaySummary";

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
  const { profile, authReady, profileReady, saveProfile, userId } = useProfile();
  const summary = useDaySummary(userId);
  const { meals } = useMeals();
  const { t, locale, setLocale } = useI18n();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady || !profileReady) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-bold text-card-foreground">{t.profileSetupTitle}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.profileSetupHint}</p>
        <button
          onClick={() => navigate("/onboarding")}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
        >
          {t.fillProfile}
        </button>
      </div>
    );
  }

  const nickname = profile.nickname || "";
  const avatarUrl = profile.avatar_url;
  const genderLabel = profile.gender === "female" ? t.female : profile.gender === "male" ? t.male : "";
  const bodyBits = [
    profile.age ? `${profile.age}${t.ageSuffix}` : "",
    genderLabel,
    profile.height_cm && profile.weight_kg ? `${profile.height_cm}cm / ${profile.weight_kg}kg` : "",
  ].filter(Boolean);
  const uniqueDays = new Set(meals.map(m => new Date(m.recorded_at).toDateString())).size;
  const streak = calcStreak(meals.map(m => m.recorded_at));
  const score = summary?.score;

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await saveProfile({ avatar_url: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleNicknameSave = async () => {
    if (nicknameValue.trim()) {
      await saveProfile({ nickname: nicknameValue.trim() });
    }
    setEditingNickname(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-card-foreground">{t.myPage}</h1>
        <div className="flex items-center gap-2">
          {(!authUser || authUser.is_anonymous) && (
            <button
              onClick={() => navigate("/login", { state: authUser?.is_anonymous ? { upgrade: true } : undefined })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-primary border border-primary/20"
            >
              🔑 {authUser?.is_anonymous ? t.loginSignUp : t.loginSignIn}
            </button>
          )}
          {authUser && !authUser.is_anonymous && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {authUser.email}
            </span>
          )}
          <button
            onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-muted-foreground"
          >
            <Globe className="w-3.5 h-3.5" />
            {locale === "zh-CN" ? "EN" : "中"}
          </button>
        </div>
      </header>

      {typeof score === "number" && (
        <section className="px-5 mb-6">
          <DietCreditCard score={score} level={t.todayScore} levelDesc={t.dietCreditBeat} beatText={t.dietCreditBeat} />
        </section>
      )}

      <section className="px-5 mb-6">
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            {/* Avatar with edit */}
            <div className="relative">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl overflow-hidden relative group"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-full">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>
            </div>
            {/* Nickname with inline edit */}
            <div className="flex-1 min-w-0">
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nicknameValue}
                    onChange={e => setNicknameValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleNicknameSave()}
                    placeholder={t.nicknamePlaceholder}
                    className="flex-1 bg-secondary rounded-lg px-3 py-1.5 text-sm text-card-foreground outline-none border border-border focus:border-primary"
                  />
                  <button onClick={handleNicknameSave} className="p-1 text-primary"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingNickname(false)} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
              ) : nickname ? (
                <button onClick={() => { setNicknameValue(nickname); setEditingNickname(true); }} className="text-left">
                  <h2 className="font-bold text-lg text-card-foreground">{nickname}</h2>
                </button>
              ) : (
                <button onClick={() => { setNicknameValue(""); setEditingNickname(true); }} className="text-left">
                  <h2 className="font-bold text-lg text-muted-foreground/50">{t.nicknamePlaceholder}</h2>
                </button>
              )}
              {bodyBits.length > 0 && (
                <p className="text-sm text-muted-foreground">{bodyBits.join(" · ")}</p>
              )}
              {profile.goal && t.goalLabels[profile.goal] && (
                <p className="text-sm text-primary font-semibold mt-0.5">
                  {t.goal}：{t.goalLabels[profile.goal]}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => navigate("/onboarding")} className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-semibold active:scale-[0.98] transition-all text-card-foreground">
            {t.editProfile}
          </button>
        </div>
      </section>

      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.dietRing}</h3>
        <div className="glass rounded-2xl p-5 shadow-card flex justify-center">
          <DietRing meals={meals} />
        </div>
      </section>

      {/* Meal Sequence Coach */}
      <section className="px-5">
        <MealSequenceCoach meals={meals} />
      </section>

      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.healthAssets}</h3>
        {typeof score === "number" && (
          <div className="glass rounded-2xl p-5 shadow-card mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-card-foreground">{t.todayScore}</span>
              </div>
              <AnimatedScore target={score} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Calendar, value: streak, label: t.consecutiveDays },
            { icon: Calendar, value: uniqueDays, label: t.recordDays },
            { icon: Utensils, value: meals.length, label: t.totalMeals },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="glass rounded-xl p-3 shadow-card text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-card-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mb-6">
        <details className="glass rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">实验性指标（未验证，默认收起）</summary>
          <div className="mt-4">
            <InvestmentReport meals={meals} score={score ?? 0} />
          </div>
        </details>
      </section>

      <section className="px-5 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.preferences}</h3>
        <div className="glass rounded-xl shadow-card divide-y divide-border">
          <button
            onClick={() => navigate("/onboarding")}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-card-foreground"
          >
            <span className="truncate">{t.allergenManagement}</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{profile.allergies || t.notSet}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-card-foreground"
          >
            <span>{t.privacy}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {authUser && (
        <section className="px-5 pb-8">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </button>
        </section>
      )}

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.logout}</AlertDialogTitle>
            <AlertDialogDescription>{t.logoutConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login", { replace: true });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.logout}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
