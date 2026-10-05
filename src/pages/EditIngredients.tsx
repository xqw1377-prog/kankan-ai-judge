import { useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Minus, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import type { FoodAnalysis } from "@/lib/foodAnalysis";

interface Ingredient {
  name: string;
  grams: number;
}

type CookingMethod = "pan_fried" | "fried" | "steamed" | "boiled" | "stir_fried" | "raw";

const STEP = 10;

const EditIngredients = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { replaceMeal, deleteMeal } = useMeals();
  const { toast } = useToast();
  const { t, locale } = useI18n();

  const { mealId, foodName: initialFoodName, ingredients: initialIngredients, fromResult, resultState } = location.state || {};
  const [foodNameValue, setFoodNameValue] = useState<string>(initialFoodName || "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialIngredients?.length ? [...initialIngredients] : []
  );
  const [modifiedIdx, setModifiedIdx] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrams, setEditGrams] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addGrams, setAddGrams] = useState("");
  const [cookingMethod, setCookingMethod] = useState<CookingMethod | null>(null);
  const [reInferring, setReInferring] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>("");
  const [serverResult, setServerResult] = useState<FoodAnalysis | null>(null);
  const [matchedRevision, setMatchedRevision] = useState<number | null>(null);

  // Rough local sketch only; the server re-estimate is the fact.
  const roughCalories = useMemo(() => Math.round(ingredients.reduce((s, i) => s + i.grams, 0) * 1.5), [ingredients]);

  // Every edit bumps the revision; a server reply for an older revision is discarded.
  const revisionRef = useRef(0);
  const invalidateAnalysis = () => {
    revisionRef.current += 1;
    setMatchedRevision(null);
    setAnalysisId("");
    setServerResult(null);
  };

  const handleEditStart = (idx: number) => {
    setEditingIdx(idx);
    setEditName(ingredients[idx].name);
    setEditGrams(String(ingredients[idx].grams));
  };

  const handleEditSave = () => {
    if (editingIdx === null) return;
    const updated = [...ingredients];
    updated[editingIdx] = { name: editName.trim() || updated[editingIdx].name, grams: Number(editGrams) || updated[editingIdx].grams };
    setIngredients(updated);
    setModifiedIdx(prev => new Set(prev).add(editingIdx));
    setEditingIdx(null);
    invalidateAnalysis();
  };

  const handleDelete = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
    invalidateAnalysis();
  };

  const handleAdd = () => {
    if (!addName.trim() || !addGrams) return;
    setIngredients([...ingredients, { name: addName.trim(), grams: Number(addGrams) }]);
    setModifiedIdx(prev => new Set(prev).add(ingredients.length));
    invalidateAnalysis();
    setAddName("");
    setAddGrams("");
    setShowAdd(false);
  };

  const showResearchFeedback = useCallback(() => {}, []);

  const handleStep = (idx: number, delta: number) => {
    const updated = [...ingredients];
    const newGrams = Math.max(1, updated[idx].grams + delta);
    updated[idx] = { ...updated[idx], grams: newGrams };
    setIngredients(updated);
    setModifiedIdx(prev => new Set(prev).add(idx));
    invalidateAnalysis();
    showResearchFeedback();
  };

  const handleSlider = (idx: number, value: number) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], grams: value };
    setIngredients(updated);
    setModifiedIdx(prev => new Set(prev).add(idx));
    invalidateAnalysis();
  };

  // Debounced research feedback for slider (fires on pointerUp)
  const handleSliderCommit = useCallback(() => {
    showResearchFeedback();
  }, [showResearchFeedback]);

  const handleReInfer = useCallback(async () => {
    if (reInferring || ingredients.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({ title: t.reestimateNeedsSignIn, variant: "destructive" });
      return;
    }
    if (sessionData.session.user.is_anonymous) {
      toast({ title: t.guestFreeLimit });
      return;
    }
    setReInferring(true);
    const revision = revisionRef.current;
    try {
      const { data, error } = await supabase.functions.invoke("re-infer-dish", {
        body: {
          ingredients,
          language: locale,
          dishName: foodNameValue.trim(),
          ...(cookingMethod ? { cookingMethod } : {}),
        },
      });
      if (revision !== revisionRef.current) return;
      if (error || data?.error || typeof data?.analysis_id !== "string") {
        toast({ title: t.reInferFailed, variant: "destructive" });
        return;
      }
      const next: FoodAnalysis = {
        food: String(data.food || ""),
        calories: Number(data.calories) || 0,
        protein_g: Number(data.protein_g) || 0,
        fat_g: Number(data.fat_g) || 0,
        carbs_g: Number(data.carbs_g) || 0,
        ingredients,
        verdict: String(data.verdict || ""),
        suggestion: String(data.suggestion || ""),
        analysis_id: data.analysis_id,
      };
      setMatchedRevision(revision);
      setAnalysisId(data.analysis_id);
      setServerResult(next);
      setFoodNameValue(next.food);
      
    } catch {
      toast({ title: t.reInferFailed, variant: "destructive" });
    } finally {
      setReInferring(false);
    }
  }, [reInferring, ingredients, locale, toast, t, foodNameValue, cookingMethod]);

  const canSave = matchedRevision !== null && matchedRevision === revisionRef.current && !!analysisId && !reInferring;

  const handleSave = async () => {
    if (!canSave) {
      toast({ title: t.needServerEstimate, variant: "destructive" });
      return;
    }
    if (fromResult && resultState) {
      if (!serverResult?.analysis_id) {
        toast({ title: t.needServerEstimate, variant: "destructive" });
        return;
      }
      navigate("/result", { state: { ...resultState, result: serverResult }, replace: true });
      return;
    }
    if (!mealId) return;
    if (!analysisId) {
      toast({ title: t.needServerEstimate, variant: "destructive" });
      return;
    }
    const { error } = await replaceMeal(mealId, analysisId);
    if (error) {
      toast({ title: t.saveMealFailed, variant: "destructive" });
      return;
    }
    toast({ title: t.reInferSuccess });
    setTimeout(() => navigate(-1), 800);
  };

  const handleDeleteMeal = async () => {
    if (!mealId || !confirm(t.editDeleteConfirm)) return;
    const { error } = await deleteMeal(mealId);
    if (error) {
      toast({ title: t.saveMealFailed, variant: "destructive" });
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} aria-label={t.back} className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm text-card-foreground">{t.editIngredientsTitle}</span>
        <span className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Editable food name + AI re-infer */}
        <div className="text-center mb-4">
                    <input
            type="text"
            value={foodNameValue}
            onChange={e => { setFoodNameValue(e.target.value); invalidateAnalysis(); }}
            placeholder={t.editFoodName}
            className="mt-1 text-xl font-bold text-center text-card-foreground bg-transparent border-b border-border/50 focus:border-primary outline-none w-full max-w-[240px] transition-colors"
          />
          <button
            onClick={handleReInfer}
            disabled={reInferring || ingredients.length === 0}
            className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
          >
            {reInferring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {reInferring ? t.reInferring : t.reInferDish}
          </button>
        </div>

        {serverResult && matchedRevision === revisionRef.current ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 mb-5">
            <p className="text-sm font-semibold text-muted-foreground">{t.newEstimate}</p>
            <p className="text-base font-bold text-card-foreground mt-1">{serverResult.food}</p>
            <p className="text-sm text-card-foreground tabular-nums mt-1">
              {Math.round(serverResult.calories)} kcal · {t.protein} {serverResult.protein_g}g · {t.fat} {serverResult.fat_g}g · {t.carbs} {serverResult.carbs_g}g
            </p>
            {serverResult.verdict ? <p className="text-sm text-muted-foreground mt-2">{serverResult.verdict}</p> : null}
            <button onClick={handleSave} disabled={!canSave} className="mt-3 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
              {t.useThisResult}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-5">≈ {roughCalories} kcal · {t.roughCalories}</p>
        )}

        {/* Cooking method selector */}
        <div className="glass rounded-xl p-3 mb-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-muted-foreground font-semibold uppercase tracking-wider">{t.cookingMethod}</span>
          </div>
          <div className="flex gap-1.5">
            {([
              { key: "pan_fried" as CookingMethod, label: t.cookPanFried, icon: "🥘" },
              { key: "fried" as CookingMethod, label: t.cookFried, icon: "🍟" },
              { key: "stir_fried" as CookingMethod, label: t.cookStirFried, icon: "🍳" },
              { key: "boiled" as CookingMethod, label: t.cookBoiled, icon: "🍲" },
              { key: "steamed" as CookingMethod, label: t.cookSteamed, icon: "♨️" },
              { key: "raw" as CookingMethod, label: t.cookRaw, icon: "🥗" },
            ]).map(({ key, label, icon }) => (
              <button key={key}
                onClick={() => { setCookingMethod(key); invalidateAnalysis(); }}
                className={`flex-1 py-2 rounded-lg text-center transition-all duration-200 ${
                  cookingMethod === key
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-muted-foreground hover:text-card-foreground"
                }`}
              >
                <div className="text-base leading-none">{icon}</div>
                <div className="text-xs font-semibold mt-1">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ingredient list with slider */}
        <div className="glass rounded-xl shadow-card divide-y divide-border mb-4">
          {ingredients.map((item, idx) => {
            const isModified = modifiedIdx.has(idx);
            return (
              <div key={idx}>
                {editingIdx === idx ? (
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={t.editIngredientName}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={editGrams}
                        onChange={e => setEditGrams(e.target.value)}
                        placeholder={t.editGrams}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-sm text-muted-foreground">g</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(idx)} className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold">
                        {t.delete}
                      </button>
                      <button onClick={() => setEditingIdx(null)} className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-card-foreground">
                        {t.cancel}
                      </button>
                      <button onClick={handleEditSave} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                        {t.done}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <div className="flex items-center">
                      <button onClick={() => handleEditStart(idx)} className="flex-1 text-left text-sm text-card-foreground">
                        {item.name}
                        {isModified && <span className="ml-1 text-xs text-primary font-bold">✓</span>}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStep(idx, -STEP)}
                          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <span className={`text-sm font-semibold w-12 text-center tabular-nums transition-colors duration-300 ${
                          isModified ? "text-primary" : "text-card-foreground"
                        }`}>
                          {item.grams}g
                        </span>
                        <button
                          onClick={() => handleStep(idx, STEP)}
                          className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Slider */}
                    <div className="mt-2 px-1">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(500, item.grams * 2)}
                        step={STEP}
                        value={item.grams}
                        onChange={e => handleSlider(idx, Number(e.target.value))}
                        onPointerUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(43 72% 52%) 0%, hsl(43 72% 52%) ${(item.grams / Math.max(500, item.grams * 2)) * 100}%, hsl(220 15% 16%) ${(item.grams / Math.max(500, item.grams * 2)) * 100}%, hsl(220 15% 16%) 100%)`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add ingredient */}
        {showAdd ? (
          <div className="glass rounded-xl shadow-card p-4 space-y-3 mb-4">
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder={t.editIngredientName}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={addGrams}
                onChange={e => setAddGrams(e.target.value)}
                placeholder={t.editGrams}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-card-foreground">
                {t.cancel}
              </button>
              <button onClick={handleAdd} disabled={!addName.trim() || !addGrams} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                {t.editAddIngredient}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-primary font-semibold">
            <Plus className="w-4 h-4" /> {t.editAddIngredient}
          </button>
        )}

        {mealId && (
          <button
            onClick={handleDeleteMeal}
            className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 mt-8"
          >
            <Trash2 className="w-4 h-4" /> {t.editDeleteMeal}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditIngredients;
