import { useRef, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Pencil, Share2, Download, X, UtensilsCrossed, Package } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { getMealTypeByTime } from "@/lib/nutrition";
import NutritionBar from "@/components/NutritionBar";
import ShareCard from "@/components/ShareCard";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

/** Bold text wrapped in 【】 brackets */
function renderSuggestionWithBold(text: string) {
  const parts = text.split(/(【[^】]+】)/g);
  return parts.map((part, i) => {
    if (part.startsWith("【") && part.endsWith("】")) {
      return <strong key={i} className="text-primary font-bold">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const result = location.state?.result;
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

  // Calculate nutrition match percentage for card theme
  const matchPct = useMemo(() => {
    if (!profile?.targets) return 50;
    const t = profile.targets;
    const calPct = t.calories > 0 ? Math.min(calories / t.calories, 1.5) : 1;
    const proPct = t.protein_g > 0 ? Math.min(protein_g / t.protein_g, 1.5) : 1;
    const fatPct = t.fat_g > 0 ? Math.min(fat_g / t.fat_g, 1.5) : 1;
    const carbPct = t.carbs_g > 0 ? Math.min(carbs_g / t.carbs_g, 1.5) : 1;
    // How close each is to ideal single-meal portion (~33% of daily)
    const idealRatio = 0.33;
    const scores = [calPct, proPct, fatPct, carbPct].map(p => {
      const diff = Math.abs(p - idealRatio);
      return Math.max(0, 1 - diff * 2);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
  }, [calories, protein_g, fat_g, carbs_g, profile?.targets]);

  // Determine card mode
  const isWarning = verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高")
    || verdict.includes("禁忌") || verdict.includes("高糖");
  const isDisciplined = matchPct > 80 && !isWarning;
  const isNeutral = !isDisciplined && !isWarning;

  // Card theme classes
  const cardTheme = isDisciplined
    ? "bg-primary/5 border-primary/20"
    : isWarning
    ? "bg-accent/5 border-accent/20"
    : "bg-secondary border-border";

  const cardAnimation = isDisciplined
    ? "animate-pulse-soft"
    : isWarning
    ? "animate-pulse"
    : "";

  const verdictIcon = isDisciplined ? "✅" : isWarning ? "⚠️" : "📋";

  const handleSave = useCallback(async () => {
    await saveMeal({
      food_name: food,
      meal_type: getMealTypeByTime(),
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
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => navigate("/")} className="p-2"><Home className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Food name + match badge */}
        <div className="text-center mb-6 animate-slide-up">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2">{food}</h1>
          <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
            isDisciplined ? "bg-primary/10 text-primary" : isWarning ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
          }`}>
            {isDisciplined ? "🎯 自律模式" : isWarning ? "🔥 警示模式" : "📋 普通模式"} · 匹配度 {matchPct}%
          </span>
        </div>

        {/* Roast card */}
        {roast && (
          <div className={`rounded-xl p-4 mb-5 border animate-slide-up ${cardTheme} ${cardAnimation}`}>
            <p className="text-sm font-bold leading-relaxed text-center">
              "{roast}"
            </p>
          </div>
        )}

        {/* Allergen warning */}
        {allergenWarnings.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-5 animate-slide-up">
            <p className="text-sm font-semibold text-destructive">⚠️ 检测到可能的过敏食材：{allergenWarnings.join("、")}</p>
          </div>
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

        {/* Verdict with themed card */}
        {verdict && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> 营养判决 <span className="flex-1 h-px bg-border" />
            </h3>
            <div className={`rounded-xl p-4 border ${cardTheme} ${cardAnimation}`}>
              <p className="text-sm leading-relaxed">{verdictIcon} {verdict}</p>
            </div>
          </section>
        )}

        {/* Scene-adaptive suggestion */}
        {suggestion && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.25s" }}>
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
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3 shrink-0">
        <button onClick={handleRetake} className="flex-1 py-4 rounded-2xl border border-border font-bold active:scale-[0.98] transition-all">
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
        <ShareCard ref={shareCardRef} food={food} calories={calories} protein_g={protein_g} fat_g={fat_g} carbs_g={carbs_g} verdict={verdict} roast={roast} ingredients={ingredients} />
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
