import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Pencil, Share2, Download, X, UtensilsCrossed, Package, Images, Stethoscope, Archive, TrendingUp, Activity } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { getMealTypeByTime } from "@/lib/nutrition";
import NutritionBar from "@/components/NutritionBar";
import ShareCard from "@/components/ShareCard";
import VirtualTable from "@/components/VirtualTable";
import InviteButton from "@/components/InviteCard";
import PerformanceTracker from "@/components/PerformanceTracker";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import html2canvas from "html2canvas";

function renderSuggestionWithBold(text: string) {
  const parts = text.split(/(【[^】]+】)/g);
  return parts.map((part, i) => {
    if (part.startsWith("【") && part.endsWith("】")) {
      return <strong key={i} className="text-primary font-bold">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function SparkleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/60"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `float-particle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

function BreathingWave() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 animate-breathe"
        style={{ background: "radial-gradient(ellipse at center, hsl(30 100% 50% / 0.06) 0%, transparent 70%)" }}
      />
    </div>
  );
}

function BvaTrendSparkline({ meals, profile }: { meals: any[]; profile: any }) {
  const { t } = useI18n();
  const dailyData = useMemo(() => {
    const now = new Date();
    const days: { label: string; score: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toDateString();
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayMeals = meals.filter((m: any) => new Date(m.recorded_at).toDateString() === dateStr);
      if (dayMeals.length === 0) { days.push({ label: dayLabel, score: 0 }); continue; }
      const totalCal = dayMeals.reduce((s: number, m: any) => s + m.calories, 0);
      const targetCal = profile?.target_calories || 2000;
      const ratio = totalCal / targetCal;
      const score = Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : Math.max(0, 200 - ratio * 100))));
      days.push({ label: dayLabel, score });
    }
    return days;
  }, [meals, profile]);

  const hasData = dailyData.some(d => d.score > 0);
  if (!hasData) return null;

  const w = 200, h = 40, pad = 4;
  const maxS = Math.max(...dailyData.map(d => d.score), 1);
  const pts = dailyData.map((d, i) => ({
    x: pad + (i / 6) * (w - pad * 2),
    y: h - pad - ((d.score / maxS) * (h - pad * 2)),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`;

  return (
    <div className="px-5 pb-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingUp className="w-3 h-3 text-primary/60" />
        <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase">
          {t.auditTrendTitle} · 7D
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bva-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#bva-fill)" />
        <path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) =>
          dailyData[i].score > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          ) : null
        )}
      </svg>
      <div className="flex justify-between px-0.5">
        {dailyData.map((d, i) => (
          <span key={i} className="text-[7px] font-mono text-muted-foreground/30">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal, todayMeals, meals } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const result = location.state?.result;
  const imageData = location.state?.imageData;
  const allImages: string[] = location.state?.images || (imageData ? [imageData] : []);
  // Pick the most visually impactful image (largest base64 = most detail/color)
  const heroImage = useMemo(() => {
    if (allImages.length <= 1) return imageData;
    return allImages.reduce((best, img) => (img.length > best.length ? img : best), allImages[0]);
  }, [allImages, imageData]);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [claimedPortions, setClaimedPortions] = useState<Record<string, number>>({});

  const {
    food = "", calories = 0, protein_g = 0, fat_g = 0, carbs_g = 0,
    ingredients = [], verdict = "", suggestion = "",
    cooking_scene = "takeout", roast = "", gi_value,
  } = result || {};

  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = ingredients
    .filter((item: any) => userAllergies.some((a: string) => item.name?.includes(a)))
    .map((item: any) => item.name);

  const matchScore = useMemo(() => {
    if (!profile?.targets) return 60;
    const tgt = profile.targets;
    const idealRatio = 0.33;
    const ratios = [
      tgt.calories > 0 ? calories / tgt.calories : idealRatio,
      tgt.protein_g > 0 ? protein_g / tgt.protein_g : idealRatio,
      tgt.fat_g > 0 ? fat_g / tgt.fat_g : idealRatio,
      tgt.carbs_g > 0 ? carbs_g / tgt.carbs_g : idealRatio,
    ];
    const scores = ratios.map(r => {
      const diff = Math.abs(r - idealRatio);
      return Math.max(0, 1 - diff * 2.5);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
  }, [calories, protein_g, fat_g, carbs_g, profile?.targets]);

  const isWarning = matchScore < 50 || verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高") || verdict.includes("禁忌") || verdict.includes("高糖");
  const isGreen = matchScore >= 80 && !isWarning;
  const emotionBg = isGreen ? "emotion-bg-green" : isWarning ? "emotion-bg-warning" : "emotion-bg-neutral";
  const verdictIcon = isGreen ? "✅" : isWarning ? "⚠️" : "📋";
  const modeLabel = isGreen ? t.modeGreen : isWarning ? t.modeWarning : t.modeNeutral;

  const handleSave = useCallback(async () => {
    await saveMeal({
      food_name: food, meal_type: getMealTypeByTime(),
      calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion,
    });
    toast({ title: "✓", description: `${food}` });
    navigate("/", { replace: true });
  }, [saveMeal, food, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, toast, navigate]);

  const handleRetake = useCallback(() => inputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      navigate("/scan", { state: { imageData: ev.target?.result as string }, replace: true });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [navigate]);

  const handleEditIngredients = useCallback(() => {
    navigate("/edit-ingredients", {
      state: { foodName: food, ingredients, fromResult: true, resultState: location.state },
    });
  }, [navigate, food, ingredients, location.state]);

  const generateShareImage = useCallback(async () => {
    if (!shareCardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      setShareImage(canvas.toDataURL("image/png"));
      setShareOpen(true);
    } catch {
      toast({ title: t.generateFailed, description: t.retry });
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  const handleDownload = useCallback(() => {
    if (!shareImage) return;
    const link = document.createElement("a");
    link.href = shareImage;
    link.download = `KanKan-${food}-${Date.now()}.png`;
    link.click();
    toast({ title: t.savedToAlbum });
  }, [shareImage, food, toast]);

  const handleShare = useCallback(async () => {
    if (!shareImage) return;
    try {
      const res = await fetch(shareImage);
      const blob = await res.blob();
      const file = new File([blob], `KanKan-${food}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `KanKan - ${food}`, text: `用 KanKan 看了一下「${food}」的营养成分`, files: [file] });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  }, [shareImage, food, handleDownload]);

  if (!result) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className={`h-full flex flex-col relative ${emotionBg}`}>
      {isGreen && <SparkleParticles />}
      {isWarning && <BreathingWave />}

      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0 relative z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => navigate("/")} className="p-2 text-muted-foreground"><Home className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4 relative z-10">
        <div className="text-center mb-5 animate-slide-up">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2 text-card-foreground">{food}</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isGreen ? "bg-success/10 text-success" : isWarning ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
            }`}>
              {modeLabel}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isGreen ? "bg-success/10 text-success" : isWarning ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
            }`}>
              {t.matchScore(matchScore)}
            </span>
          </div>
        </div>

        {allImages.length > 1 && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.02s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Images className="w-4 h-4" /> {t.originalPhotos(allImages.length)}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {allImages.map((src, i) => (
                <div key={i} className="shrink-0 w-28 h-28 rounded-xl overflow-hidden shadow-card snap-start border border-border">
                  <img src={src} alt={`原图-${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {allergenWarnings.length > 0 && (
          <div className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-4 mb-5 animate-slide-up flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">🚨</span>
            <div>
              <p className="text-sm font-bold text-destructive">{t.allergenWarningTitle}</p>
              <p className="text-sm font-semibold text-destructive/90 mt-1">{t.allergenWarningDesc(allergenWarnings.join("、"))}</p>
              <p className="text-xs text-destructive/60 mt-1">{t.allergenWarningHint}</p>
            </div>
          </div>
        )}

        {(verdict || roast) && (
          <section className="mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
            <div className={`glass rounded-2xl p-6 relative overflow-hidden ${
              isGreen ? "border-success/20" : isWarning ? "border-warning/20" : ""
            }`} style={{ borderWidth: 1 }}>
              {isGreen && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-success/30 animate-sparkle"
                      style={{ left: `${15 + Math.random() * 70}%`, top: `${15 + Math.random() * 70}%`, animationDelay: `${i * 0.4}s` }}
                    />
                  ))}
                </div>
              )}
              {roast && (
                <p className="text-xl font-black leading-snug text-center mb-3 relative z-10 text-card-foreground" style={{ letterSpacing: -0.3 }}>
                  "{roast}"
                </p>
              )}
              {verdict && (
                <p className="text-sm leading-relaxed text-center text-muted-foreground relative z-10">
                  {verdictIcon} {verdict}
                </p>
              )}
            </div>
          </section>
        )}

        {/* BVA Management Panel */}
        {suggestion && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.07s" }}>
            <div className={`rounded-2xl relative overflow-hidden border ${
              isWarning
                ? "bg-destructive/6 border-destructive/20"
                : isGreen
                  ? "bg-[hsl(160_60%_45%/0.06)] border-[hsl(160_60%_45%/0.2)]"
                  : "glass border-border"
            }`}>
              {/* Header */}
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isWarning ? "text-destructive" : isGreen ? "text-[hsl(160_60%_55%)]" : "text-primary"}`} />
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                  {t.bvaManagement}
                </span>
                <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider ${
                  isWarning
                    ? "bg-destructive/10 text-destructive"
                    : isGreen
                      ? "bg-[hsl(160_60%_45%/0.1)] text-[hsl(160_60%_55%)]"
                      : "bg-secondary text-muted-foreground"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isWarning ? "bg-destructive animate-pulse" : isGreen ? "bg-[hsl(160_60%_45%)]" : "bg-primary"
                  }`} />
                  {isWarning ? t.riskHigh : isGreen ? t.actuarialAssetUp : t.riskLow}
                </div>
              </div>

              {/* Core Advice */}
              <div className="px-5 pb-4">
                <p className={`text-base font-bold leading-relaxed font-mono ${
                  isWarning ? "text-destructive" : isGreen ? "text-[hsl(160_60%_55%)]" : "text-card-foreground"
                }`}>
                  💡 {renderSuggestionWithBold(suggestion)}
                </p>
              </div>

              {/* 7-Day BVA Trend Sparkline */}
              <BvaTrendSparkline meals={meals} profile={profile} />

              {/* Storage Footer */}
              <div className="px-5 py-2.5 border-t border-border/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Archive className="w-3 h-3 text-muted-foreground/30" />
                  <span className="text-[8px] font-mono text-muted-foreground/30 tracking-wider">
                    {t.auditDataCompressed}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-muted-foreground/20">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </section>
        )}

        {ingredients.length > 0 && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> {t.ingredientList} <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="glass rounded-xl p-4 shadow-card">
              {ingredients.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm flex items-center gap-1 text-card-foreground">
                    {allergenWarnings.includes(item.name) && <span className="text-destructive">⚠️</span>}
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.grams}g</span>
                </div>
              ))}
            </div>
            <button onClick={handleEditIngredients} className="flex items-center gap-1 text-primary text-xs font-semibold mt-2 ml-1">
              <Pencil className="w-3 h-3" /> {t.editIngredients}
            </button>
          </section>
        )}

        {ingredients.length > 0 && (
          <VirtualTable
            ingredients={ingredients}
            calories={calories}
            protein_g={protein_g}
            fat_g={fat_g}
            carbs_g={carbs_g}
            food={food}
            onPortionsChange={setClaimedPortions}
          />
        )}

        <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-8 h-px bg-border" /> {t.nutritionAnalysis} <span className="flex-1 h-px bg-border" />
          </h3>
          <div className="glass rounded-xl p-4 shadow-card space-y-3">
            <NutritionBar label={t.energy} current={calories} target={profile?.targets?.calories || 2100} unit="kcal" />
            <NutritionBar label={t.protein} current={protein_g} target={profile?.targets?.protein_g || 120} unit="g" />
            <NutritionBar label={t.fat} current={fat_g} target={profile?.targets?.fat_g || 58} unit="g" />
            <NutritionBar label={t.carbs} current={carbs_g} target={profile?.targets?.carbs_g || 263} unit="g" />
          </div>
        </section>

        <PerformanceTracker
          calories={calories}
          protein_g={protein_g}
          fat_g={fat_g}
          carbs_g={carbs_g}
          targetCalories={profile?.targets?.calories || 2100}
          weight={profile?.weight_kg || 70}
          gi_value={gi_value}
          todayMeals={[
            ...(todayMeals || []).map(m => ({ name: m.food_name, carbs_g: m.carbs_g })),
            { name: food, carbs_g },
          ]}
        />

        {suggestion && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> {t.repairSuggestion} <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="glass rounded-xl p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  cooking_scene === "homemade" ? "bg-success/10" : "bg-warning/10"
                }`}>
                  {cooking_scene === "homemade"
                    ? <UtensilsCrossed className="w-4 h-4 text-success" />
                    : <Package className="w-4 h-4 text-warning" />
                  }
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {cooking_scene === "homemade" ? t.homemadeSuggestion : t.takeoutSuggestion}
                  </span>
                  <p className="text-sm leading-relaxed mt-1 text-card-foreground">
                    💡 {renderSuggestionWithBold(suggestion)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Invite tablemates */}
        <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <InviteButton food={food} imageData={imageData} calories={calories} />
        </section>
      </div>

      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3 shrink-0 relative z-10">
        <button onClick={handleRetake} className="flex-1 py-4 rounded-2xl border border-border glass font-bold active:scale-[0.98] transition-all truncate text-card-foreground">
          {t.retake}
        </button>
        <button
          onClick={generateShareImage}
          disabled={generating}
          className="flex-1 py-4 rounded-2xl border border-primary/30 bg-primary/5 text-primary font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          {generating ? t.generating : t.share}
        </button>
        <button onClick={handleSave} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all truncate">
          {t.recordMeal}
        </button>
      </div>

      <div style={{ position: "fixed", left: -9999, top: 0 }}>
        <ShareCard
          ref={shareCardRef}
          food={food} calories={calories} protein_g={protein_g} fat_g={fat_g} carbs_g={carbs_g}
          verdict={verdict} roast={roast} ingredients={ingredients} imageData={heroImage}
          score={matchScore} locale={locale}
        />
      </div>

      {shareOpen && shareImage && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <button onClick={() => { setShareOpen(false); setShareImage(null); }} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
          <div className="px-6 w-full max-w-sm">
            <img src={shareImage} alt="分享卡片" className="w-full rounded-2xl shadow-soft mb-6" style={{ maxHeight: "60vh", objectFit: "contain" }} />
            <p className="text-center text-xs text-muted-foreground mb-5">{t.longPressToSave}</p>
            <div className="flex gap-3">
              <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl border border-border glass font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate text-card-foreground">
                <Download className="w-4 h-4 shrink-0" /> {t.saveToAlbum}
              </button>
              <button onClick={handleShare} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate">
                <Share2 className="w-4 h-4 shrink-0" /> {t.shareToFriend}
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default Result;
