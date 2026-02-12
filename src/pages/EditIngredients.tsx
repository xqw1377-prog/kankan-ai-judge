import { useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Plus, Trash2, Minus, Sparkles } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface Ingredient {
  name: string;
  grams: number;
}

const STEP = 10;

const EditIngredients = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateMeal } = useMeals();
  const { toast } = useToast();
  const { t } = useI18n();

  const { mealId, foodName, ingredients: initialIngredients, fromResult, resultState } = location.state || {};
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
  const [showConfetti, setShowConfetti] = useState(false);

  // Real-time nutrition estimation
  const nutrition = useMemo(() => {
    const totalGrams = ingredients.reduce((s, i) => s + i.grams, 0);
    return {
      calories: Math.round(totalGrams * 1.5),
      protein_g: Math.round(totalGrams * 0.08),
      fat_g: Math.round(totalGrams * 0.06),
      carbs_g: Math.round(totalGrams * 0.2),
    };
  }, [ingredients]);

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
  };

  const handleDelete = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleAdd = () => {
    if (!addName.trim() || !addGrams) return;
    setIngredients([...ingredients, { name: addName.trim(), grams: Number(addGrams) }]);
    setModifiedIdx(prev => new Set(prev).add(ingredients.length));
    setAddName("");
    setAddGrams("");
    setShowAdd(false);
  };

  const handleStep = (idx: number, delta: number) => {
    const updated = [...ingredients];
    const newGrams = Math.max(1, updated[idx].grams + delta);
    updated[idx] = { ...updated[idx], grams: newGrams };
    setIngredients(updated);
    setModifiedIdx(prev => new Set(prev).add(idx));
  };

  const handleSlider = (idx: number, value: number) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], grams: value };
    setIngredients(updated);
    setModifiedIdx(prev => new Set(prev).add(idx));
  };

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, []);

  const handleSave = async () => {
    if (fromResult && resultState) {
      triggerConfetti();
      toast({
        title: "🎉 KANKAN " + t.editExpGain,
        description: t.editExpDesc,
      });
      setTimeout(() => {
        navigate("/result", {
          state: {
            ...resultState,
            result: { ...resultState.result, ingredients, ...nutrition },
          },
          replace: true,
        });
      }, 800);
    } else if (mealId) {
      await updateMeal(mealId, { ingredients: ingredients as any, ...nutrition });
      triggerConfetti();
      toast({
        title: "🎉 KANKAN " + t.editExpGain,
        description: t.editExpDescUpdated,
      });
      setTimeout(() => navigate(-1), 800);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="animate-scale-in flex flex-col items-center gap-2">
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
            <span className="text-lg font-bold text-primary animate-fade-in">EXP +1</span>
          </div>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#D4AF37", "#FF9800", "#39FF14", "#E91E63", "#9C27B0"][i % 5],
                left: `${20 + Math.random() * 60}%`,
                top: `${30 + Math.random() * 40}%`,
                animation: `confetti-fall ${0.8 + Math.random() * 0.6}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm text-card-foreground">{t.editIngredientsTitle}</span>
        <button onClick={handleSave} className="p-2 text-primary">
          <Check className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Food name + real-time nutrition preview */}
        <div className="text-center mb-4">
          <span className="text-3xl">🍜</span>
          <h2 className="text-xl font-bold mt-1 text-card-foreground">{foodName || t.editIngredientsTitle}</h2>
        </div>

        {/* Real-time nutrition bar */}
        <div className="glass rounded-xl p-3 mb-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{t.livePreview}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-center flex-1">
              <div className={`text-lg font-bold tabular-nums transition-colors duration-300 ${modifiedIdx.size > 0 ? "text-primary text-glow-gold" : "text-card-foreground"}`}>
                {nutrition.calories}
              </div>
              <div className="text-[9px] text-muted-foreground">{t.energy}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <div className={`text-sm font-bold tabular-nums transition-colors duration-300 ${modifiedIdx.size > 0 ? "text-primary" : "text-card-foreground"}`}>
                {nutrition.protein_g}g
              </div>
              <div className="text-[9px] text-muted-foreground">{t.protein}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <div className={`text-sm font-bold tabular-nums transition-colors duration-300 ${modifiedIdx.size > 0 ? "text-primary" : "text-card-foreground"}`}>
                {nutrition.fat_g}g
              </div>
              <div className="text-[9px] text-muted-foreground">{t.fat}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <div className={`text-sm font-bold tabular-nums transition-colors duration-300 ${modifiedIdx.size > 0 ? "text-primary" : "text-card-foreground"}`}>
                {nutrition.carbs_g}g
              </div>
              <div className="text-[9px] text-muted-foreground">{t.carbs}</div>
            </div>
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
                        {isModified && <span className="ml-1 text-[8px] text-primary font-bold">✓</span>}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStep(idx, -STEP)}
                          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <span className={`text-sm font-semibold w-12 text-center tabular-nums transition-colors duration-300 ${
                          isModified ? "text-primary text-glow-gold" : "text-card-foreground"
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
            onClick={() => { if (confirm(t.editDeleteConfirm)) navigate("/", { replace: true }); }}
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
