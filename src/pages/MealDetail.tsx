import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
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

  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = meal?.ingredients
    .filter((item) => userAllergies.some((a: string) => item.name?.includes(a)))
    .map((item) => item.name) || [];

  if (!meal) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">记录不存在</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-semibold">返回</button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm("确定删除这条记录吗？")) return;
    await deleteMeal(meal.id);
    toast({ title: "已删除" });
    navigate(-1);
  };

  const handleEdit = () => {
    navigate("/edit-ingredients", {
      state: { mealId: meal.id, foodName: meal.food_name, ingredients: meal.ingredients },
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-sm text-card-foreground">餐品详情</span>
        <button onClick={handleEdit} className="p-2 text-primary"><Pencil className="w-4 h-4" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="text-center mb-6">
          <span className="text-4xl">🍜</span>
          <h1 className="text-2xl font-bold mt-2 text-card-foreground">{meal.food_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleString("zh-CN")}
          </p>
        </div>

        {allergenWarnings.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-5 animate-fade-in">
            <p className="text-sm font-semibold text-destructive">⚠️ 检测到可能的过敏食材：{allergenWarnings.join("、")}</p>
            <p className="text-xs text-destructive/70 mt-1">您在画像中标记了对以上食材过敏，请谨慎食用</p>
          </div>
        )}

        {meal.ingredients.length > 0 && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">食材清单</h3>
            <div className="glass rounded-xl p-4 shadow-card">
              {meal.ingredients.map((item, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm flex items-center gap-1 text-card-foreground">
                    {allergenWarnings.includes(item.name) && <span className="text-destructive">⚠️</span>}
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.grams}g</span>
                </div>
              ))}
            </div>
            <button onClick={handleEdit} className="flex items-center gap-1 text-primary text-xs font-semibold mt-2 ml-1">
              <Pencil className="w-3 h-3" /> 编辑食材
            </button>
          </section>
        )}

        <section className="mb-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">营养素分析</h3>
          <div className="glass rounded-xl p-4 shadow-card space-y-3">
            {profile?.targetsFromServer && profile.targets && profile.targets.calories > 0 ? (
              <>
                <NutritionBar label="能量" current={meal.calories} target={profile.targets.calories} unit="kcal" />
                <NutritionBar label="蛋白" current={meal.protein_g} target={profile.targets.protein_g} unit="g" />
                <NutritionBar label="脂肪" current={meal.fat_g} target={profile.targets.fat_g} unit="g" />
                <NutritionBar label="碳水" current={meal.carbs_g} target={profile.targets.carbs_g} unit="g" />
              </>
            ) : (
              <p className="text-sm text-card-foreground">
                {meal.calories} kcal · 蛋白 {Math.round(meal.protein_g)}g · 脂肪 {Math.round(meal.fat_g)}g · 碳水 {Math.round(meal.carbs_g)}g
              </p>
            )}
          </div>
        </section>

        {meal.verdict && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">营养判决</h3>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-card-foreground">⚠️ {meal.verdict}</p>
            </div>
          </section>
        )}

        {meal.suggestion && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">修复建议</h3>
            <div className="glass rounded-xl p-4 shadow-card">
              <p className="text-sm text-card-foreground">💡 {meal.suggestion}</p>
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
