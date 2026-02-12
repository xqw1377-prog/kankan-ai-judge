import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, ImagePlus, Globe } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";
import NutritionBar from "@/components/NutritionBar";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n";

const MAX_PHOTOS = 5;

const Index = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { todayMeals, todayTotals, loading: mealsLoading } = useMeals();
  const { t, locale, setLocale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/welcome", { replace: true });
    } else if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const handleCapture = () => {
    if (photos.length === 0) {
      inputRef.current?.click();
    } else {
      navigate("/scan", { state: { images: photos } });
    }
  };

  const addPhoto = (file: File) => {
    if (photos.length >= MAX_PHOTOS) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setPhotos(prev => prev.length < MAX_PHOTOS ? [...prev, data] : prev);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addPhoto(file);
    e.target.value = "";
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addPhoto(file);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  if (profileLoading || mealsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const nickname = profile.gender === "female" ? "小丽" : "小张";
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t.greetingMorning : hour < 14 ? t.greetingNoon : hour < 18 ? t.greetingAfternoon : t.greetingEvening;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}，</p>
            <h1 className="text-xl font-bold text-card-foreground">{nickname}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass text-[10px] font-bold text-muted-foreground tracking-wider"
            >
              <Globe className="w-3 h-3" />
              {locale === "zh-CN" ? "EN" : "中"}
            </button>
            <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <span className="text-lg">👤</span>
            </button>
          </div>
        </div>
      </header>

      <section className="px-5 mb-6">
        <div className="glass rounded-2xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">{t.todayGoal}</h2>
          <div className="space-y-3">
            <NutritionBar label={t.energy} current={todayTotals.calories} target={profile.targets.calories} unit="kcal" />
            <NutritionBar label={t.protein} current={todayTotals.protein_g} target={profile.targets.protein_g} unit="g" />
            <NutritionBar label={t.fat} current={todayTotals.fat_g} target={profile.targets.fat_g} unit="g" />
            <NutritionBar label={t.carbs} current={todayTotals.carbs_g} target={profile.targets.carbs_g} unit="g" />
          </div>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="px-5 mb-4 animate-fade-in">
          <div className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{t.selectedPhotos(photos.length, MAX_PHOTOS)}</h3>
              <button onClick={() => setPhotos([])} className="text-xs text-destructive font-semibold">{t.clear}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-border">
                  <img src={src} alt={`photo-${i}`} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button onClick={() => addMoreRef.current?.click()} className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <ImagePlus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col items-center mb-6">
        <button
          onClick={handleCapture}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-soft active:scale-95 transition-transform ${
            photos.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-primary text-primary-foreground animate-pulse-soft"
          }`}
        >
          <Camera className="w-8 h-8" />
        </button>
        <p className="text-sm text-muted-foreground mt-3">
          {photos.length === 0 ? t.takePhoto : t.startRecognize(photos.length)}
        </p>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={addMoreRef} type="file" accept="image/*" className="hidden" onChange={handleAddMore} />
      </section>

      <section className="px-5 pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t.recentRecords}</h2>
        {todayMeals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">{t.noRecords}</p>
        ) : (
          <div className="space-y-2">
            {todayMeals.slice(0, 3).map(meal => (
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
