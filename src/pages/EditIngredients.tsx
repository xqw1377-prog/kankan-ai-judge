import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Plus, Trash2, Minus, Sparkles } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  grams: number;
}

const STEP = 10; // grams per step

const EditIngredients = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateMeal } = useMeals();
  const { toast } = useToast();

  const { mealId, foodName, ingredients: initialIngredients, fromResult, resultState } = location.state || {};
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialIngredients?.length ? [...initialIngredients] : []
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrams, setEditGrams] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addGrams, setAddGrams] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

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
    setEditingIdx(null);
  };

  const handleDelete = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleAdd = () => {
    if (!addName.trim() || !addGrams) return;
    setIngredients([...ingredients, { name: addName.trim(), grams: Number(addGrams) }]);
    setAddName("");
    setAddGrams("");
    setShowAdd(false);
  };

  // Quick +/- stepper
  const handleStep = (idx: number, delta: number) => {
    const updated = [...ingredients];
    const newGrams = Math.max(1, updated[idx].grams + delta);
    updated[idx] = { ...updated[idx], grams: newGrams };
    setIngredients(updated);
  };

  const estimateNutrition = (items: Ingredient[]) => {
    const totalGrams = items.reduce((s, i) => s + i.grams, 0);
    const calories = Math.round(totalGrams * 1.5);
    const protein_g = Math.round(totalGrams * 0.08);
    const fat_g = Math.round(totalGrams * 0.06);
    const carbs_g = Math.round(totalGrams * 0.2);
    return { calories, protein_g, fat_g, carbs_g };
  };

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, []);

  const handleSave = async () => {
    if (fromResult && resultState) {
      const nutrition = estimateNutrition(ingredients);
      triggerConfetti();
      toast({
        title: "🎉 KANKAN 变得更聪明了！",
        description: "经验值 +1 · 感谢你的纠正",
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
      const nutrition = estimateNutrition(ingredients);
      await updateMeal(mealId, { ingredients: ingredients as any, ...nutrition });
      triggerConfetti();
      toast({
        title: "🎉 KANKAN 变得更聪明了！",
        description: "经验值 +1 · 数据已更新",
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
          {/* Confetti particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#4CAF50", "#FF9800", "#2196F3", "#E91E63", "#9C27B0"][i % 5],
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
        <button onClick={() => navigate(-1)} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">编辑食材</span>
        <button onClick={handleSave} className="p-2 text-primary">
          <Check className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="text-center mb-6">
          <span className="text-3xl">🍜</span>
          <h2 className="text-xl font-bold mt-1">{foodName || "食物"}</h2>
        </div>

        {/* Ingredient list with stepper */}
        <div className="bg-card rounded-xl shadow-card divide-y divide-border mb-4">
          {ingredients.map((item, idx) => (
            <div key={idx}>
              {editingIdx === idx ? (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="食材名称"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={editGrams}
                      onChange={e => setEditGrams(e.target.value)}
                      placeholder="克重"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(idx)} className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold">
                      删除
                    </button>
                    <button onClick={() => setEditingIdx(null)} className="px-3 py-2 rounded-lg border border-border text-xs font-semibold">
                      取消
                    </button>
                    <button onClick={handleEditSave} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                      确认
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center px-4 py-3">
                  <button onClick={() => handleEditStart(idx)} className="flex-1 text-left text-sm">
                    {item.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStep(idx, -STEP)}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-12 text-center tabular-nums">{item.grams}g</span>
                    <button
                      onClick={() => handleStep(idx, STEP)}
                      className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add ingredient */}
        {showAdd ? (
          <div className="bg-card rounded-xl shadow-card p-4 space-y-3 mb-4">
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="食材名称"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={addGrams}
                onChange={e => setAddGrams(e.target.value)}
                placeholder="克重"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold">
                取消
              </button>
              <button onClick={handleAdd} disabled={!addName.trim() || !addGrams} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                添加
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-primary font-semibold">
            <Plus className="w-4 h-4" /> 添加其他食材
          </button>
        )}

        {mealId && (
          <button
            onClick={() => { if (confirm("确定删除本餐吗？")) navigate("/", { replace: true }); }}
            className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 mt-8"
          >
            <Trash2 className="w-4 h-4" /> 删除本餐
          </button>
        )}
      </div>
    </div>
  );
};

export default EditIngredients;
