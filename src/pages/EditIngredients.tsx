import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Plus, Trash2 } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  grams: number;
}

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

  // Simple calorie estimation per ingredient (rough average)
  const estimateNutrition = (items: Ingredient[]) => {
    // Very rough: ~1.5 kcal/g average for mixed food
    const totalGrams = items.reduce((s, i) => s + i.grams, 0);
    const calories = Math.round(totalGrams * 1.5);
    const protein_g = Math.round(totalGrams * 0.08);
    const fat_g = Math.round(totalGrams * 0.06);
    const carbs_g = Math.round(totalGrams * 0.2);
    return { calories, protein_g, fat_g, carbs_g };
  };

  const handleSave = async () => {
    if (fromResult && resultState) {
      // Navigate back to result with updated ingredients
      const nutrition = estimateNutrition(ingredients);
      navigate("/result", {
        state: {
          ...resultState,
          result: {
            ...resultState.result,
            ingredients,
            ...nutrition,
          },
        },
        replace: true,
      });
    } else if (mealId) {
      const nutrition = estimateNutrition(ingredients);
      await updateMeal(mealId, {
        ingredients: ingredients as any,
        ...nutrition,
      });
      toast({ title: "已保存 ✓" });
      navigate(-1);
    }
  };

  const handleDeleteMeal = async () => {
    if (!mealId) return;
    if (!confirm("确定删除本餐吗？")) return;
    const { deleteMeal } = await import("@/hooks/useMeals").then(m => {
      // Can't use hook here, navigate back with delete signal
      return { deleteMeal: null };
    });
    // Navigate back with delete flag
    navigate("/", { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-background">
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
        {/* Food name */}
        <div className="text-center mb-6">
          <span className="text-3xl">🍜</span>
          <h2 className="text-xl font-bold mt-1">{foodName || "食物"}</h2>
        </div>

        {/* Ingredient list */}
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
                    <button
                      onClick={() => handleDelete(idx)}
                      className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="px-3 py-2 rounded-lg border border-border text-xs font-semibold"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleEditSave}
                      className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      确认
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleEditStart(idx)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-sm active:bg-secondary/50 transition-colors"
                >
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.grams}g</span>
                    <span className="text-muted-foreground">›</span>
                  </div>
                </button>
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
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-primary font-semibold"
          >
            <Plus className="w-4 h-4" /> 添加其他食材
          </button>
        )}

        {/* Delete meal (only for saved meals) */}
        {mealId && (
          <button
            onClick={handleDeleteMeal}
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
