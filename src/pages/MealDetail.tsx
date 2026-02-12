import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import NutritionBar from "@/components/NutritionBar";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useToast } from "@/hooks/use-toast";

const MealDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meals, deleteMeal } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();

  const meal = meals.find(m => m.id === id);

  if (!meal) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">记录不存在</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm("确定删除这条记录吗？")) return;
    await deleteMeal(meal.id);
    toast({ title: "已删除" });
    navigate(-1);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-sm">餐品详情</span>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="text-center mb-6">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2">{meal.food_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleString("zh-CN")}
          </p>
        </div>

        {/* Ingredients */}
        {meal.ingredients.length > 0 && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">食材清单</h3>
            <div className="bg-card rounded-xl p-4 shadow-card">
              {meal.ingredients.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.grams}g</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nutrition */}
        <section className="mb-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">营养素分析</h3>
          <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <NutritionBar label="能量" current={meal.calories} target={profile?.targets?.calories || 2100} unit="kcal" />
            <NutritionBar label="蛋白" current={meal.protein_g} target={profile?.targets?.protein_g || 120} unit="g" />
            <NutritionBar label="脂肪" current={meal.fat_g} target={profile?.targets?.fat_g || 58} unit="g" />
            <NutritionBar label="碳水" current={meal.carbs_g} target={profile?.targets?.carbs_g || 263} unit="g" />
          </div>
        </section>

        {meal.verdict && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">营养判决</h3>
            <div className="bg-secondary rounded-xl p-4">
              <p className="text-sm">⚠️ {meal.verdict}</p>
            </div>
          </section>
        )}

        {meal.suggestion && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">修复建议</h3>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <p className="text-sm">💡 {meal.suggestion}</p>
            </div>
          </section>
        )}

        <button
          onClick={handleDelete}
          className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 mt-4"
        >
          <Trash2 className="w-4 h-4" /> 删除记录
        </button>
      </div>
    </div>
  );
};

export default MealDetail;
