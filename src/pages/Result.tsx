import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { isPlaceholderAnalysis, mealResultLines, type FoodAnalysis } from "@/lib/foodAnalysis";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal, userId } = useMeals();
  const { toast } = useToast();
  const { t } = useI18n();
  const result = location.state?.result as FoodAnalysis | undefined;
  const imageData = location.state?.imageData as string | undefined;
  const allImages: string[] = location.state?.images || (imageData ? [imageData] : []);
  const heroImage = allImages[0] || imageData;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [needSignIn, setNeedSignIn] = useState(false);

  useEffect(() => {
    if (!result) navigate("/", { replace: true });
  }, [result, navigate]);

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        {t.backHome}
      </div>
    );
  }

  if (isPlaceholderAnalysis(result)) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-semibold text-card-foreground">没能完成估算</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.analysisUnrecognized}</p>
        <button onClick={() => navigate("/", { replace: true })} className="text-sm text-primary underline">
          {t.backHome}
        </button>
      </div>
    );
  }

  const [seen, problem, action] = mealResultLines(result);
  const openEdit = () => navigate("/edit-ingredients", {
    state: { foodName: result.food, ingredients: result.ingredients, fromResult: true, resultState: location.state },
  });

  const handleSave = async () => {
    if (saving || saved) return;
    if (!userId) {
      setNeedSignIn(true);
      toast({ title: t.saveNeedsSignIn, variant: "destructive" });
      return;
    }
    if (!result.analysis_id) {
      toast({ title: t.saveMealFailed, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await saveMeal(result.analysis_id);
    setSaving(false);
    const message = error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message)
      : "";
    if (message === "signin") {
      setNeedSignIn(true);
      toast({ title: t.saveNeedsSignIn, variant: "destructive" });
      return;
    }
    if (error || !data?.id) {
      toast({ title: t.saveMealFailed, variant: "destructive" });
      return;
    }
    setSaved(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground" aria-label={t.backHome}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => navigate("/")} className="p-2 text-muted-foreground" aria-label={t.backHome}>
          <Home className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {heroImage && (
          <img src={heroImage} alt={seen} className="w-full max-h-56 object-cover rounded-2xl mb-5" />
        )}
        <div className="space-y-4 text-base leading-relaxed text-card-foreground">
          <div className="flex items-start gap-3">
            <p className="flex-1"><span className="text-muted-foreground">{t.resultSeen}：</span>{seen}</p>
            <button type="button" onClick={openEdit} className="shrink-0 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-sm font-semibold">
              {t.resultEditShort}
            </button>
          </div>
          <p><span className="text-muted-foreground">{t.resultProblem}：</span>{problem}</p>
          <p><span className="text-muted-foreground">{t.resultAction}：</span>{action}</p>
        </div>

        <details className="mt-6 glass rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">{t.resultMore}</summary>
          <div className="mt-4 space-y-3 text-sm text-card-foreground">
            <p className="tabular-nums">
              {Math.round(result.calories)} kcal · {t.protein} {result.protein_g}g · {t.fat} {result.fat_g}g · {t.carbs} {result.carbs_g}g
            </p>
            {result.ingredients.length > 0 && (
              <ul className="space-y-1 text-muted-foreground">
                {result.ingredients.map((item) => (
                  <li key={`${item.name}-${item.grams}`}>{item.name}{item.grams ? ` ${item.grams}g` : ""}</li>
                ))}
              </ul>
            )}
            {result.verdict ? <p>{result.verdict}</p> : null}
            {result.suggestion ? <p>{result.suggestion}</p> : null}
          </div>
        </details>
      </div>

      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 space-y-3">
        {saved ? (
          <button
            onClick={() => navigate("/history")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold"
          >
            {t.viewHistory}
          </button>
        ) : needSignIn ? (
          <button
            onClick={() => navigate("/login")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold"
          >
            {t.loginSignIn}
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
          >
            {t.saveToLog}
          </button>
        )}
        <button onClick={() => navigate("/scan", { replace: true })} className="w-full text-sm text-muted-foreground">
          {t.retake}
        </button>
      </div>
    </div>
  );
};

export default Result;
