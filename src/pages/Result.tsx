import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Pencil, Share2, Download, X, UtensilsCrossed, Package } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { getMealTypeByTime } from "@/lib/nutrition";
import NutritionBar from "@/components/NutritionBar";
import ShareCard from "@/components/ShareCard";
import { useToast } from "@/hooks/use-toast";
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

/** Floating sparkle particles for green mode */
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

/** Breathing wave overlay for warning mode */
function BreathingWave() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 animate-breathe"
        style={{
          background: "radial-gradient(ellipse at center, hsl(30 100% 50% / 0.06) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const result = location.state?.result;
  const imageData = location.state?.imageData;
  const inputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const {
    food = "", calories = 0, protein_g = 0, fat_g = 0, carbs_g = 0,
    ingredients = [], verdict = "", suggestion = "",
    cooking_scene = "takeout", roast = "",
  } = result || {};

  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = ingredients
    .filter((item: any) => userAllergies.some((a: string) => item.name?.includes(a)))
    .map((item: any) => item.name);

  // Score-based emotion system (0-100)
  const matchScore = useMemo(() => {
    if (!profile?.targets) return 60;
    const t = profile.targets;
    const idealRatio = 0.33;
    const ratios = [
      t.calories > 0 ? calories / t.calories : idealRatio,
      t.protein_g > 0 ? protein_g / t.protein_g : idealRatio,
      t.fat_g > 0 ? fat_g / t.fat_g : idealRatio,
      t.carbs_g > 0 ? carbs_g / t.carbs_g : idealRatio,
    ];
    const scores = ratios.map(r => {
      const diff = Math.abs(r - idealRatio);
      return Math.max(0, 1 - diff * 2.5);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
  }, [calories, protein_g, fat_g, carbs_g, profile?.targets]);

  // Determine emotion tier
  const isWarning = matchScore < 50 || verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高") || verdict.includes("禁忌") || verdict.includes("高糖");
  const isGreen = matchScore >= 80 && !isWarning;
  const emotionBg = isGreen ? "emotion-bg-green" : isWarning ? "emotion-bg-warning" : "emotion-bg-neutral";
  const verdictIcon = isGreen ? "✅" : isWarning ? "⚠️" : "📋";
  const modeLabel = isGreen ? "🎯 自律模式" : isWarning ? "🔥 警示模式" : "📋 普通模式";

  const handleSave = useCallback(async () => {
    await saveMeal({
      food_name: food, meal_type: getMealTypeByTime(),
      calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion,
    });
    toast({ title: "已保存 ✓", description: `${food} 已记录` });
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
      toast({ title: "生成失败", description: "请重试" });
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
    toast({ title: "已保存到相册 📸" });
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
      {/* Emotion particles */}
      {isGreen && <SparkleParticles />}
      {isWarning && <BreathingWave />}

      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0 relative z-10">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => navigate("/")} className="p-2"><Home className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4 relative z-10">
        {/* Score badge + food name */}
        <div className="text-center mb-5 animate-slide-up">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2">{food}</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isGreen ? "bg-primary/10 text-primary" : isWarning ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
            }`}>
              {modeLabel}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isGreen ? "bg-primary/10 text-primary" : isWarning ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
            }`}>
              匹配度 {matchScore}%
            </span>
          </div>
        </div>

        {/* Allergen warning - forced above verdict */}
        {allergenWarnings.length > 0 && (
          <div className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-4 mb-5 animate-slide-up flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">🚨</span>
            <div>
              <p className="text-sm font-bold text-destructive">过敏风险警告</p>
              <p className="text-sm font-semibold text-destructive/90 mt-1">检测到忌口食材：{allergenWarnings.join("、")}</p>
              <p className="text-xs text-destructive/60 mt-1">您在画像中标记了对以上食材过敏，请谨慎食用</p>
            </div>
          </div>
        )}

        {/* Magazine-style verdict hero */}
        {(verdict || roast) && (
          <section className="mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
            <div className={`rounded-2xl p-6 border relative overflow-hidden ${
              isGreen ? "bg-primary/5 border-primary/20" : isWarning ? "bg-accent/5 border-accent/20" : "bg-card border-border"
            }`}>
              {isGreen && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/30 animate-sparkle"
                      style={{
                        left: `${15 + Math.random() * 70}%`,
                        top: `${15 + Math.random() * 70}%`,
                        animationDelay: `${i * 0.4}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {roast && (
                <p className="text-xl font-black leading-snug text-center mb-3 relative z-10" style={{ letterSpacing: -0.3 }}>
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

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> 食材清单 <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="bg-card rounded-xl p-4 shadow-card">
              {ingredients.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm flex items-center gap-1">
                    {allergenWarnings.includes(item.name) && <span className="text-destructive">⚠️</span>}
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.grams}g</span>
                </div>
              ))}
            </div>
            <button onClick={handleEditIngredients} className="flex items-center gap-1 text-primary text-xs font-semibold mt-2 ml-1">
              <Pencil className="w-3 h-3" /> 编辑食材
            </button>
          </section>
        )}

        {/* Nutrition */}
        <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-8 h-px bg-border" /> 营养素分析 <span className="flex-1 h-px bg-border" />
          </h3>
          <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <NutritionBar label="能量" current={calories} target={profile?.targets?.calories || 2100} unit="kcal" />
            <NutritionBar label="蛋白" current={protein_g} target={profile?.targets?.protein_g || 120} unit="g" />
            <NutritionBar label="脂肪" current={fat_g} target={profile?.targets?.fat_g || 58} unit="g" />
            <NutritionBar label="碳水" current={carbs_g} target={profile?.targets?.carbs_g || 263} unit="g" />
          </div>
        </section>

        {/* Scene-adaptive suggestion */}
        {suggestion && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> 修复建议 <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  cooking_scene === "homemade" ? "bg-primary/10" : "bg-accent/10"
                }`}>
                  {cooking_scene === "homemade"
                    ? <UtensilsCrossed className="w-4 h-4 text-primary" />
                    : <Package className="w-4 h-4 text-accent" />
                  }
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {cooking_scene === "homemade" ? "🍳 自炊建议" : "📦 外卖建议"}
                  </span>
                  <p className="text-sm leading-relaxed mt-1">
                    💡 {renderSuggestionWithBold(suggestion)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3 shrink-0 relative z-10">
        <button onClick={handleRetake} className="flex-1 py-4 rounded-2xl border border-border bg-card font-bold active:scale-[0.98] transition-all">
          重拍
        </button>
        <button
          onClick={generateShareImage}
          disabled={generating}
          className="flex-1 py-4 rounded-2xl border border-primary/30 bg-primary/5 text-primary font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          {generating ? "生成中…" : "分享"}
        </button>
        <button onClick={handleSave} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all">
          记一笔
        </button>
      </div>

      {/* Hidden share card */}
      <div style={{ position: "fixed", left: -9999, top: 0 }}>
        <ShareCard
          ref={shareCardRef}
          food={food}
          calories={calories}
          protein_g={protein_g}
          fat_g={fat_g}
          carbs_g={carbs_g}
          verdict={verdict}
          roast={roast}
          ingredients={ingredients}
          imageData={imageData}
          score={matchScore}
        />
      </div>

      {/* Share modal */}
      {shareOpen && shareImage && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <button onClick={() => { setShareOpen(false); setShareImage(null); }} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
          <div className="px-6 w-full max-w-sm">
            <img src={shareImage} alt="分享卡片" className="w-full rounded-2xl shadow-soft mb-6" style={{ maxHeight: "60vh", objectFit: "contain" }} />
            <p className="text-center text-xs text-muted-foreground mb-5">长按图片可直接保存</p>
            <div className="flex gap-3">
              <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl border border-border font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> 保存图片
              </button>
              <button onClick={handleShare} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> 分享给好友
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
