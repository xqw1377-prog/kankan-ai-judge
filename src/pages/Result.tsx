import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, PlusCircle } from "lucide-react";
import { appendTargetFromMeal, estimateMergedMeal, type AppendTarget } from "@/lib/mealAppend";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { isPlaceholderAnalysis, mealResultLines, type FoodAnalysis } from "@/lib/foodAnalysis";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveMeal, replaceMeal, userId } = useMeals();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const appendTo = location.state?.appendTo as AppendTarget | undefined;
  const result = location.state?.result as FoodAnalysis | undefined;
  const imageData = location.state?.imageData as string | undefined;
  const allImages: string[] = location.state?.images || (imageData ? [imageData] : []);
  const heroImage = allImages[0] || imageData;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTarget, setSavedTarget] = useState<AppendTarget | null>(null);
  const [needSignIn, setNeedSignIn] = useState(false);

  // Block tab close / reload while a save is in flight so it can't fail silently.
  useEffect(() => {
    if (!saving) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saving]);

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
        <p className="text-base font-semibold text-card-foreground">{t.analysisFailedTitle}</p>
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
    if (appendTo) {
      const merged = await estimateMergedMeal(appendTo, result, locale);
      if (!merged.ok) {
        setSaving(false);
        if ((merged as { reason: string }).reason === "guest") { setNeedSignIn(true); toast({ title: t.guestFreeLimit }); }
        else toast({ title: t.saveMealFailed, variant: "destructive" });
        return;
      }
      const { error: mergeError } = await replaceMeal(appendTo.mealId, (merged as { result: { analysis_id?: string } }).result.analysis_id!);
      setSaving(false);
      if (mergeError) { toast({ title: t.saveMealFailed, variant: "destructive" }); return; }
      toast({ title: t.mealSavedToast });
      navigate(`/meal/${appendTo.mealId}`, { replace: true });
      return;
    }
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
    toast({ title: t.mealSavedToast });
    setSavedTarget(appendTargetFromMeal(data));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => (saving ? toast({ title: t.savingWait }) : navigate(-1))} className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground" aria-label={t.backHome}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => (saving ? toast({ title: t.savingWait }) : navigate("/"))} className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground" aria-label={t.backHome}>
          <Home className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {appendTo && (
          <p className="mb-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm text-primary font-semibold">
            {t.appendBanner(appendTo.food)}
          </p>
        )}
        {heroImage && (
          <img src={heroImage} alt={seen} className="w-full max-h-56 object-cover rounded-2xl mb-3" />
        )}
        <p className="text-sm font-semibold text-card-foreground mb-4">{t.appSlogan}</p>
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
          <>
            <p role="status" className="text-center text-sm font-semibold text-primary">{t.mealSavedToast}</p>
            {savedTarget && (
              <button
                onClick={() => navigate("/scan", { state: { appendTo: savedTarget } })}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" /> {t.appendSameMeal}
              </button>
            )}
            <button
              onClick={() => navigate("/history")}
              className="w-full py-3 rounded-2xl border border-border text-card-foreground font-semibold"
            >
              {t.viewHistory}
            </button>
          </>
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
            {saving ? t.savingNow : appendTo ? t.appendMergeSave : t.saveToLog}
          </button>
        )}
        <button disabled={saving} onClick={() => navigate("/scan", { replace: true })} className="w-full min-h-11 disabled:opacity-50 text-sm text-muted-foreground">
          {t.retake}
        </button>
      </div>
    </div>
  );
};

export default Result;
