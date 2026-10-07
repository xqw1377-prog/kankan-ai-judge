import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, PlusCircle } from "lucide-react";
import { appendTargetFromMeal } from "@/lib/mealAppend";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import NutritionBar from "@/components/NutritionBar";
import { getMealTypeLabel } from "@/lib/nutrition";
import { mealResultLines } from "@/lib/foodAnalysis";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Same reading order as Result: 看到 / 问题 / 这一口, numbers under 更多细节. */
const MealDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meals, deleteMeal } = useMeals();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const meal = meals.find(m => m.id === id);

  const userAllergies = profile?.allergies?.split(/[,，、\s]+/).filter(Boolean) || [];
  const allergenWarnings = meal?.ingredients
    .filter((item) => userAllergies.some((allergy) => item.name?.includes(allergy)))
    .map((item) => item.name) || [];

  if (!meal) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t.mealNotFound}</p>
        <button onClick={() => navigate(-1)} className="min-h-11 px-4 text-primary text-sm font-semibold">{t.back}</button>
      </div>
    );
  }

  const [seen, problem, action] = mealResultLines({
    food: meal.food_name,
    ingredients: meal.ingredients,
    verdict: meal.verdict ?? undefined,
    suggestion: meal.suggestion ?? undefined,
  });

  const handleDelete = async () => {
    await deleteMeal(meal.id);
    toast({ title: t.mealDeleted });
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
        <button onClick={() => navigate(-1)} aria-label={t.back} className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-card-foreground">{t.mealDetailTitle}</h1>
        <span className="min-w-11" aria-hidden="true" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-card-foreground">{meal.food_name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {getMealTypeLabel(meal.meal_type, locale)} · {new Date(meal.recorded_at).toLocaleString(locale)}
          </p>
        </div>

        {allergenWarnings.length > 0 && (
          <div data-testid="avoidance-note" className="bg-secondary border border-border rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-card-foreground">{t.allergenTitle(allergenWarnings.join("、"))}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.allergenDesc}</p>
          </div>
        )}

        <div className="space-y-4 text-base leading-relaxed text-card-foreground">
          <div className="flex items-start gap-3">
            <p className="flex-1"><span className="text-muted-foreground">{t.resultSeen}：</span>{seen}</p>
            <button type="button" onClick={handleEdit} className="shrink-0 min-h-11 px-3 rounded-full border border-primary/40 text-primary text-sm font-semibold">
              {t.resultEditShort}
            </button>
          </div>
          <p><span className="text-muted-foreground">{t.resultProblem}：</span>{problem}</p>
          <p><span className="text-muted-foreground">{t.resultAction}：</span>{action}</p>
        </div>

        <button
          onClick={() => navigate("/scan", { state: { appendTo: appendTargetFromMeal(meal) } })}
          className="w-full mt-6 min-h-11 py-3 rounded-xl border border-primary/40 text-primary text-sm font-semibold flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> {t.appendSameMeal}
        </button>

        <details open className="mt-6 glass rounded-2xl p-4">
          <summary className="cursor-pointer min-h-11 flex items-center text-sm font-semibold text-muted-foreground">{t.resultMore}</summary>
          <div className="mt-3 space-y-3 text-sm text-card-foreground">
            {profile?.targets && profile.targets.calories > 0 ? (
              <>
                <NutritionBar label={t.energy} current={meal.calories} target={profile.targets.calories} unit="kcal" />
                <NutritionBar label={t.protein} current={meal.protein_g} target={profile.targets.protein_g} unit="g" />
                <NutritionBar label={t.fat} current={meal.fat_g} target={profile.targets.fat_g} unit="g" />
                <NutritionBar label={t.carbs} current={meal.carbs_g} target={profile.targets.carbs_g} unit="g" />
              </>
            ) : (
              <p className="tabular-nums">
                {meal.calories} kcal · {t.protein} {Math.round(meal.protein_g)}g · {t.fat} {Math.round(meal.fat_g)}g · {t.carbs} {Math.round(meal.carbs_g)}g
              </p>
            )}
            {meal.ingredients.length > 0 && (
              <div>
                <h3 className="font-semibold text-muted-foreground mb-1">{t.ingredientList}</h3>
                <ul className="space-y-1 text-muted-foreground">
                  {meal.ingredients.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>{item.grams}g</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        <button
          onClick={() => setConfirmOpen(true)}
          className="w-full min-h-11 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 mt-6"
        >
          <Trash2 className="w-4 h-4" /> {t.deleteMealBtn}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteMealConfirm}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.back}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">
              {t.deleteMealBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MealDetail;
