import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Share2, Download, X, UtensilsCrossed, Package, Images, Archive, TrendingUp, Activity, Plus, Trash2, ShieldCheck, Calculator } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { getMealTypeByTime } from "@/lib/nutrition";
import NutritionBar from "@/components/NutritionBar";
import ShareCard from "@/components/ShareCard";
import VirtualTable from "@/components/VirtualTable";
import InviteButton from "@/components/InviteCard";
import PerformanceTracker from "@/components/PerformanceTracker";
import BioStrategySimulation, { type SequenceQuality } from "@/components/BioStrategySimulation";
import BpiGauge from "@/components/BpiGauge";
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

  type CookMethod = "steam" | "stirfry" | "deepfry" | "braised";
  const COOK_METHODS: { key: CookMethod; icon: string; label: string; calMul: number; fatMul: number }[] = [
    { key: "steam",   icon: "💧", label: t.cookSteamed + "/" + t.cookBoiled, calMul: 1.0, fatMul: 1.0 },
    { key: "stirfry", icon: "🔥", label: t.cookStirFried,                   calMul: 1.2, fatMul: 1.3 },
    { key: "deepfry", icon: "🍳", label: t.cookFried,                       calMul: 1.8, fatMul: 2.2 },
    { key: "braised", icon: "🫕", label: t.cookPanFried,                    calMul: 1.5, fatMul: 1.6 },
  ];

  const [editableIngredients, setEditableIngredients] = useState<Array<{ name: string; grams: number; protein: number; fat: number; carbs: number; calories: number; cookMethod: CookMethod }>>(
    () => (ingredients || []).map((item: any) => ({
      name: item.name || "", grams: item.grams || 0,
      protein: item.protein || 0, fat: item.fat || 0, carbs: item.carbs || 0,
      calories: item.calories || Math.round((item.protein || 0) * 4 + (item.fat || 0) * 9 + (item.carbs || 0) * 4),
      cookMethod: "steam" as CookMethod,
    }))
  );
  const [confirmed, setConfirmed] = useState(false);
  const [archiveAnim, setArchiveAnim] = useState(false);
  const [sequenceQuality, setSequenceQuality] = useState<SequenceQuality>("optimal");
  const [showSuboptimalDialog, setShowSuboptimalDialog] = useState(false);

  // Live recalculated totals from editable ingredients (with cooking multipliers)
  const liveTotals = useMemo(() => {
    const totals = editableIngredients.reduce((acc, ing) => {
      const method = COOK_METHODS.find(m => m.key === ing.cookMethod) || COOK_METHODS[0];
      return {
        calories: acc.calories + Math.round(ing.calories * method.calMul),
        protein_g: acc.protein_g + ing.protein,
        fat_g: acc.fat_g + Math.round(ing.fat * method.fatMul * 10) / 10,
        carbs_g: acc.carbs_g + ing.carbs,
      };
    }, { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 });
    const hasBreakdown = editableIngredients.some(i => i.protein > 0 || i.fat > 0 || i.carbs > 0);
    return hasBreakdown ? totals : { calories, protein_g, fat_g, carbs_g };
  }, [editableIngredients, calories, protein_g, fat_g, carbs_g]);

  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = ingredients
    .filter((item: any) => userAllergies.some((a: string) => item.name?.includes(a)))
    .map((item: any) => item.name);

  const matchScore = useMemo(() => {
    if (!profile?.targets) return 60;
    const tgt = profile.targets;
    const idealRatio = 0.33;
    const ratios = [
      tgt.calories > 0 ? liveTotals.calories / tgt.calories : idealRatio,
      tgt.protein_g > 0 ? liveTotals.protein_g / tgt.protein_g : idealRatio,
      tgt.fat_g > 0 ? liveTotals.fat_g / tgt.fat_g : idealRatio,
      tgt.carbs_g > 0 ? liveTotals.carbs_g / tgt.carbs_g : idealRatio,
    ];
    const scores = ratios.map(r => {
      const diff = Math.abs(r - idealRatio);
      return Math.max(0, 1 - diff * 2.5);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
  }, [liveTotals, profile?.targets]);

  const isWarning = matchScore < 50 || verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高") || verdict.includes("禁忌") || verdict.includes("高糖");
  const isGreen = matchScore >= 80 && !isWarning;
  const emotionBg = isGreen ? "emotion-bg-green" : isWarning ? "emotion-bg-warning" : "emotion-bg-neutral";
  const verdictIcon = isGreen ? "✅" : isWarning ? "⚠️" : "📋";
  const modeLabel = isGreen ? t.modeGreen : isWarning ? t.modeWarning : t.modeNeutral;

  const CONFIRM_API = "http://192.168.3.101:8080/api/v1/audit/confirm";

  const handleSaveAttempt = useCallback(() => {
    if (confirmed) return;
    if (sequenceQuality !== "optimal" && editableIngredients.length > 1) {
      setShowSuboptimalDialog(true);
      return;
    }
    handleSave();
  }, [confirmed, sequenceQuality, editableIngredients.length]);

  const handleSave = useCallback(async () => {
    if (confirmed) return;

    const finalPayload = {
      food_name: food,
      meal_type: getMealTypeByTime(),
      calories: liveTotals.calories,
      protein_g: liveTotals.protein_g,
      fat_g: liveTotals.fat_g,
      carbs_g: liveTotals.carbs_g,
      ingredients: editableIngredients,
      verdict,
      suggestion,
    };

    // 1. Send to 8080 confirm endpoint
    try {
      const res = await fetch(CONFIRM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      // If 8080 is unreachable, still persist locally
      console.warn("Audit confirm API unreachable, saving locally only");
    }

    // 2. Persist to database
    await saveMeal(finalPayload);

    // 3. Success feedback
    setConfirmed(true);
    setArchiveAnim(true);
    toast({ title: t.archivedToHistory });
    setTimeout(() => navigate("/", { replace: true }), 1800);
  }, [confirmed, saveMeal, food, liveTotals, editableIngredients, verdict, suggestion, toast, navigate, t]);

  const handleUpdateIngredient = useCallback((index: number, field: string, value: string) => {
    setEditableIngredients(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const numVal = Number(value) || 0;
      if (field === "name") return { ...item, name: value };
      const updated = { ...item, [field]: numVal };
      // Auto-recalc calories from macros when protein/fat/carbs change
      if (["protein", "fat", "carbs"].includes(field)) {
        updated.calories = Math.round(updated.protein * 4 + updated.fat * 9 + updated.carbs * 4);
      }
      return updated;
    }));
  }, []);

  const handleAddIngredient = useCallback(() => {
    setEditableIngredients(prev => [...prev, { name: "", grams: 50, protein: 0, fat: 0, carbs: 0, calories: 0, cookMethod: "steam" as CookMethod }]);
  }, []);

  const handleDeleteIngredient = useCallback((index: number) => {
    setEditableIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

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

        {/* BPI Gauge */}
        <BpiGauge
          calories={liveTotals.calories}
          protein_g={liveTotals.protein_g}
          fat_g={liveTotals.fat_g}
          carbs_g={liveTotals.carbs_g}
          gi_value={gi_value}
        />

        {/* Bio-Strategy Simulation */}
        <BioStrategySimulation ingredients={editableIngredients} visible={editableIngredients.length > 0} onSequenceQualityChange={setSequenceQuality} />

        {editableIngredients.length >= 0 && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> {t.ingredientList} <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="glass rounded-xl p-4 shadow-card space-y-3">
              {/* Column headers */}
              {editableIngredients.length > 0 && (
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/50 tracking-wider uppercase px-0.5">
                  <span className="flex-1 min-w-0">{t.ingredientNamePlaceholder}</span>
                  <span className="w-16 text-center">g</span>
                  <span className="w-7" />
                </div>
              )}
              {editableIngredients.map((item, i) => {
                const lower = item.name.toLowerCase();
                const isVeg = /菜|蔬|叶|菠|芹|broccoli|spinach|lettuce|vegetable|greens|salad/.test(lower);
                const isCarb = /米|饭|面|粉|麦|bread|rice|noodle|pasta|糖|sugar/.test(lower);
                const isMeat = /鸡|鸭|猪|牛|羊|肉|鱼|虾|蛋|豆腐|chicken|pork|beef|meat|fish|egg|tofu|protein/.test(lower);
                const ballColor = isVeg ? "hsl(200, 80%, 55%)" : isCarb ? "hsl(0, 72%, 55%)" : isMeat ? "hsl(43, 80%, 52%)" : undefined;
                const ballLabel = isVeg ? "🛡" : isCarb ? "⚡" : isMeat ? "💪" : undefined;
                const method = COOK_METHODS.find(m => m.key === item.cookMethod) || COOK_METHODS[0];
                const methodIdx = COOK_METHODS.findIndex(m => m.key === item.cookMethod);
                const isModified = item.cookMethod !== "steam";
                const adjustedCal = Math.round(item.calories * method.calMul);
                const adjustedFat = Math.round(item.fat * method.fatMul * 10) / 10;

                const handleCycleCook = () => {
                  const nextIdx = (methodIdx + 1) % COOK_METHODS.length;
                  setEditableIngredients(prev => prev.map((it, j) =>
                    j === i ? { ...it, cookMethod: COOK_METHODS[nextIdx].key } : it
                  ));
                };

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Funnel type indicator */}
                      <div className="w-5 flex items-center justify-center shrink-0">
                        {ballColor ? (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px]"
                            style={{
                              background: `radial-gradient(circle at 35% 35%, ${ballColor}dd, ${ballColor}88)`,
                              boxShadow: `0 1px 4px ${ballColor}40`,
                            }}
                          >
                            {ballLabel}
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono text-muted-foreground/30">●</span>
                        )}
                      </div>
                      {allergenWarnings.includes(item.name) && <span className="text-destructive text-xs">⚠️</span>}
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleUpdateIngredient(i, "name", e.target.value)}
                        placeholder={t.ingredientNamePlaceholder}
                        className="flex-1 min-w-0 text-xs bg-secondary/50 border border-border/50 rounded-lg px-2 py-1.5 text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                      />
                      <input type="number" value={item.grams} onChange={e => handleUpdateIngredient(i, "grams", e.target.value)}
                        className="w-16 text-xs text-center bg-secondary/50 border border-border/50 rounded-lg px-1 py-1.5 text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      {/* Cooking method toggle */}
                      <button
                        onClick={handleCycleCook}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300 border shrink-0 ${
                          isModified
                            ? "border-warning/40 bg-warning/10 shadow-sm scale-105"
                            : "border-border/30 hover:border-border/50"
                        }`}
                        title={`${method.label} ×${method.calMul}`}
                      >
                        <span className={isModified ? "animate-pulse" : ""}>{method.icon}</span>
                      </button>
                      <button onClick={() => handleDeleteIngredient(i)}
                        className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Cooking method label + adjusted values */}
                    {isModified && (
                      <div className="flex items-center gap-2 ml-7 animate-fade-in">
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                          {method.icon} {method.label} ×{method.calMul}
                        </span>
                        <span className="text-[8px] font-mono font-bold text-warning animate-pulse">
                          {adjustedCal}kcal
                        </span>
                        <span className="text-[8px] font-mono font-bold text-warning animate-pulse">
                          fat {adjustedFat}g
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <button onClick={handleAddIngredient}
                  className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:opacity-80 transition-opacity">
                  <Plus className="w-3.5 h-3.5" /> {t.addIngredient}
                </button>
                {editableIngredients.length > 0 && (
                  <div className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/40">
                    <Calculator className="w-3 h-3" />
                    <span>{liveTotals.calories} kcal · {t.liveRecalcHint}</span>
                  </div>
                )}
              </div>
              {/* Ball legend */}
              {editableIngredients.length > 0 && (
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(200, 80%, 55%)" }} />
                    <span className="text-[8px] font-mono text-muted-foreground/40">{t.digestOrderAccel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(43, 80%, 52%)" }} />
                    <span className="text-[8px] font-mono text-muted-foreground/40">💪</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0, 72%, 55%)" }} />
                    <span className="text-[8px] font-mono text-muted-foreground/40">{t.digestOrderBrake}</span>
                  </div>
                </div>
              )}
            </div>
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
            <NutritionBar label={t.energy} current={liveTotals.calories} target={profile?.targets?.calories || 2100} unit="kcal" />
            <NutritionBar label={t.protein} current={liveTotals.protein_g} target={profile?.targets?.protein_g || 120} unit="g" />
            <NutritionBar label={t.fat} current={liveTotals.fat_g} target={profile?.targets?.fat_g || 58} unit="g" />
            <NutritionBar label={t.carbs} current={liveTotals.carbs_g} target={profile?.targets?.carbs_g || 263} unit="g" />
          </div>
        </section>

        <PerformanceTracker
          calories={liveTotals.calories}
          protein_g={liveTotals.protein_g}
          fat_g={liveTotals.fat_g}
          carbs_g={liveTotals.carbs_g}
          targetCalories={profile?.targets?.calories || 2100}
          weight={profile?.weight_kg || 70}
          gi_value={gi_value}
          todayMeals={[
            ...(todayMeals || []).map(m => ({ name: m.food_name, carbs_g: m.carbs_g })),
            { name: food, carbs_g: liveTotals.carbs_g },
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
        <button onClick={handleRetake} className="py-4 px-4 rounded-2xl border border-border glass font-bold active:scale-[0.98] transition-all truncate text-card-foreground">
          {t.retake}
        </button>
        <button
          onClick={generateShareImage}
          disabled={generating}
          className="py-4 px-4 rounded-2xl border border-primary/30 bg-primary/5 text-primary font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          {generating ? t.generating : t.share}
        </button>
        <button
          onClick={handleSaveAttempt}
          disabled={confirmed}
          className={`flex-1 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate ${
            confirmed
              ? "bg-success/20 text-success border border-success/30"
              : "bg-primary text-primary-foreground"
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {confirmed ? t.auditConfirmed : t.signAndArchive}
        </button>
      </div>

      {/* Suboptimal sequence confirmation dialog */}
      <AlertDialog open={showSuboptimalDialog} onOpenChange={setShowSuboptimalDialog}>
        <AlertDialogContent className="glass border-destructive/30 max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-base">
              {t.confirmSuboptimalTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-relaxed">
              {t.confirmSuboptimalDesc(sequenceQuality === "poor" ? 15 : 8)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel className="w-full">{t.confirmSuboptimalCancel}</AlertDialogCancel>
            <AlertDialogAction className="w-full" onClick={() => { setShowSuboptimalDialog(false); handleSave(); }}>
              {t.confirmSuboptimalProceed}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {archiveAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center gap-4 animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center border-2 border-success/40">
              <ShieldCheck className="w-10 h-10 text-success animate-pulse" />
            </div>
            <p className="text-sm font-mono font-bold text-success tracking-wider">{t.archivedToHistory}</p>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/50">
              <Archive className="w-3 h-3" />
              <span>{t.auditDataCompressed}</span>
            </div>
          </div>
        </div>
      )}

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
