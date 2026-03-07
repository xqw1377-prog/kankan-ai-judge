import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Share2, Download, X, UtensilsCrossed, Package, Images, Archive, TrendingUp, Activity, Plus, Trash2, ShieldCheck, Calculator, Zap } from "lucide-react";
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
import AssetPnLStatement from "@/components/AssetPnLStatement";
import PostMealAudit from "@/components/PostMealAudit";
import BrainBattery from "@/components/BrainBattery";
import { useHabitLearner } from "@/hooks/useHabitLearner";
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

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal, todayMeals, meals } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const { applyHabits, recordEdit, isTrustedMeal } = useHabitLearner();
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

  type CookMethod = "steam" | "stirfry" | "braised" | "deepfry";
  const COOK_METHODS: { key: CookMethod; icon: string; label: string; calMul: number; fatMul: number }[] = [
    { key: "steam",   icon: "♨️", label: "清蒸", calMul: 1.0, fatMul: 1.0 },
    { key: "stirfry", icon: "🔥", label: "清炒", calMul: 1.2, fatMul: 1.3 },
    { key: "braised", icon: "🫕", label: "红烧", calMul: 1.5, fatMul: 1.6 },
    { key: "deepfry", icon: "🍳", label: "油炸", calMul: 2.0, fatMul: 2.5 },
  ];

  const [habitAppliedNames, setHabitAppliedNames] = useState<string[]>([]);
  const [editableIngredients, setEditableIngredients] = useState<Array<{ name: string; grams: number; protein: number; fat: number; carbs: number; calories: number; cookMethod: CookMethod }>>(() => {
    const base = (ingredients || []).map((item: any) => ({
      name: item.name || "", grams: item.grams || 0,
      protein: item.protein || 0, fat: item.fat || 0, carbs: item.carbs || 0,
      calories: item.calories || Math.round((item.protein || 0) * 4 + (item.fat || 0) * 9 + (item.carbs || 0) * 4),
      cookMethod: "steam" as CookMethod,
    }));
    const { ingredients: corrected, applied } = applyHabits(base);
    if (applied.length > 0) {
      setTimeout(() => {
        setHabitAppliedNames(applied);
        toast({ title: "🤖 已按习惯校准", description: `自动修正 ${applied.length} 项食材偏好` });
      }, 500);
    }
    return corrected as typeof base;
  });
  const [confirmed, setConfirmed] = useState(false);
  const [archiveAnim, setArchiveAnim] = useState(false);
  const [sequenceQuality, setSequenceQuality] = useState<SequenceQuality>("optimal");
  const [showSuboptimalDialog, setShowSuboptimalDialog] = useState(false);
  const [savedMealId, setSavedMealId] = useState<string | null>(null);
  const isTrusted = isTrustedMeal(editableIngredients);

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

  // Predict feeling based on current nutrition profile
  const predictedFeeling = useMemo(() => {
    if (liveTotals.calories > 900 || liveTotals.fat_g > 35) return "crash" as const;
    if (liveTotals.protein_g > 25 && liveTotals.calories < 600) return "great" as const;
    return "ok" as const;
  }, [liveTotals]);

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

    // 1. Send to Cloud audit-confirm edge function
    try {
      const deviceId = (await import("@/lib/device")).getDeviceId();
      await supabase.functions.invoke("audit-confirm", {
        body: { ...finalPayload, device_id: deviceId },
      });
    } catch {
      console.warn("Audit confirm edge function unreachable, saving locally only");
    }

    // 2. Persist to database
    const { data: savedData } = await saveMeal(finalPayload);
    if (savedData?.id) setSavedMealId(savedData.id);

    // 3. Record habit patterns for learning
    for (const ing of editableIngredients) {
      const original = (ingredients || []).find((o: any) => o.name === ing.name || o.grams === ing.grams);
      if (original) {
        const hasChanges = original.name !== ing.name || original.grams !== ing.grams || ing.cookMethod !== "steam";
        if (hasChanges) {
          recordEdit(original.name || ing.name, ing.name, ing.grams, ing.cookMethod);
        }
      }
    }

    // 4. Success feedback
    setConfirmed(true);
    setArchiveAnim(true);
    toast({ title: t.archivedToHistory });
    // Don't auto-navigate — let PostMealAudit dialog fire first
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
        {/* Brain Battery Dashboard */}
        <BrainBattery
          calories={liveTotals.calories}
          fat_g={liveTotals.fat_g}
          carbs_g={liveTotals.carbs_g}
          protein_g={liveTotals.protein_g}
          gi_value={gi_value}
        />

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

        {/* Asset P&L Statement */}
        {suggestion && (
          <AssetPnLStatement
            calories={liveTotals.calories}
            protein_g={liveTotals.protein_g}
            fat_g={liveTotals.fat_g}
            carbs_g={liveTotals.carbs_g}
            suggestion={suggestion}
            isWarning={isWarning}
            isGreen={isGreen}
            meals={meals}
            profile={profile}
          />
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
        <BioStrategySimulation
          dish={{
            name: food,
            calories: liveTotals.calories,
            protein_g: liveTotals.protein_g,
            fat_g: liveTotals.fat_g,
            carbs_g: liveTotals.carbs_g,
            cookMethod: editableIngredients[0]?.cookMethod,
          }}
          todayMeals={todayMeals.filter(m => m.food_name !== food).map(m => ({
            id: m.id,
            food_name: m.food_name,
            calories: m.calories,
            protein_g: Number(m.protein_g),
            fat_g: Number(m.fat_g),
            carbs_g: Number(m.carbs_g),
          }))}
          visible={true}
          onSequenceQualityChange={setSequenceQuality}
        />

        {/* Ingredient Edit Entry */}
        {editableIngredients.length > 0 && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <button
              onClick={handleEditIngredients}
              className="w-full glass rounded-xl p-4 shadow-card flex items-center justify-between hover:border-primary/30 transition-all border border-border/30 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-card-foreground">{t.ingredientList}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {editableIngredients.length} {t.ingredientCount} · {liveTotals.calories} kcal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/40 group-hover:text-primary transition-colors">
                <span className="text-[9px] font-mono">{t.editIngredientHint}</span>
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              </div>
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

      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 relative z-10 space-y-2">
        {/* Trust Mode — one-click save for historically trusted meals */}
        {isTrusted && !confirmed && (
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-2xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-success/15 text-success border border-success/30 animate-fade-in"
          >
            <Zap className="w-4 h-4" />
            ⚡ 信任模式 · 一键秒存
          </button>
        )}
        <div className="flex gap-3">
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

      {/* Post-Meal Audit Dialog — triggers after archive */}
      <PostMealAudit
        mealId={savedMealId}
        foodName={food}
        triggered={confirmed}
        ingredients={editableIngredients}
        predictedFeeling={predictedFeeling}
      />
    </div>
  );
};

export default Result;
