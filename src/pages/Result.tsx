import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Pencil } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { getMealTypeByTime } from "@/lib/nutrition";
import NutritionBar from "@/components/NutritionBar";
import { useToast } from "@/hooks/use-toast";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const result = location.state?.result;
  const imageData = location.state?.imageData;
  const inputRef = useRef<HTMLInputElement>(null);

  if (!result) {
    navigate("/", { replace: true });
    return null;
  }

  const { food, calories = 0, protein_g = 0, fat_g = 0, carbs_g = 0, ingredients = [], verdict = "", suggestion = "" } = result;

  // Check for allergen warnings
  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = ingredients
    .filter((item: any) => userAllergies.some(a => item.name?.includes(a)))
    .map((item: any) => item.name);

  const handleSave = async () => {
    await saveMeal({
      food_name: food,
      meal_type: getMealTypeByTime(),
      calories,
      protein_g,
      fat_g,
      carbs_g,
      ingredients,
      verdict,
      suggestion,
    });
    toast({ title: "已保存 ✓", description: `${food} 已记录` });
    navigate("/", { replace: true });
  };

  const handleRetake = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      navigate("/scan", { state: { imageData: ev.target?.result as string }, replace: true });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditIngredients = () => {
    navigate("/edit-ingredients", {
      state: {
        foodName: food,
        ingredients,
        fromResult: true,
        resultState: location.state,
      },
    });
  };

  // Determine verdict style
  const isNegative = verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高");
  const isPositive = verdict.includes("不错") || verdict.includes("健康") || verdict.includes("均衡");
  const verdictBg = isNegative
    ? "bg-destructive/5 border-destructive/20"
    : isPositive
    ? "bg-primary/5 border-primary/20"
    : "bg-secondary border-border";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => navigate("/")} className="p-2"><Home className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Food name */}
        <div className="text-center mb-6 animate-slide-up">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2">{food}</h1>
        </div>

        {/* Allergen warning */}
        {allergenWarnings.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-5 animate-slide-up">
            <p className="text-sm font-semibold text-destructive">
              ⚠️ 检测到可能的过敏食材：{allergenWarnings.join("、")}
            </p>
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
            <button
              onClick={handleEditIngredients}
              className="flex items-center gap-1 text-primary text-xs font-semibold mt-2 ml-1"
            >
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

        {/* Verdict */}
        {verdict && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> 营养判决 <span className="flex-1 h-px bg-border" />
            </h3>
            <div className={`rounded-xl p-4 border ${verdictBg}`}>
              <p className="text-sm leading-relaxed">
                {isNegative ? "⚠️" : isPositive ? "✅" : "📋"} {verdict}
              </p>
            </div>
          </section>
        )}

        {/* Suggestion */}
        {suggestion && (
          <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-border" /> 修复建议 <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <p className="text-sm leading-relaxed">💡 {suggestion}</p>
            </div>
          </section>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3 shrink-0">
        <button
          onClick={handleRetake}
          className="flex-1 py-4 rounded-2xl border border-border font-bold active:scale-[0.98] transition-all"
        >
          重拍
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all"
        >
          记一笔
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default Result;
