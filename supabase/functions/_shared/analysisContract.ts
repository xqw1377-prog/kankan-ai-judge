export const ANALYSIS_LIMITS = {
  foodNameMax: 100,
  ingredientCountMax: 30,
  ingredientNameMax: 40,
  gramsMax: 2000,
  caloriesMax: 5000,
  macroMax: 500,
} as const;

export interface ValidIngredient {
  name: string;
  grams: number;
}

export interface ValidAnalysis {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients: ValidIngredient[];
  verdict: string;
  suggestion: string;
}

export type ContractResult<T> = { ok: true; value: T } | { ok: false; error: string };

function finite(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export function validateIngredientList(input: unknown): ContractResult<ValidIngredient[]> {
  if (!Array.isArray(input) || input.length < 1 || input.length > ANALYSIS_LIMITS.ingredientCountMax) {
    return { ok: false, error: "食材数量不正确" };
  }
  const ingredients: ValidIngredient[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { ok: false, error: "食材不正确" };
    const row = item as { name?: unknown; grams?: unknown };
    const name = text(row.name, ANALYSIS_LIMITS.ingredientNameMax);
    const grams = finite(row.grams);
    if (!name || grams == null || grams <= 0 || grams > ANALYSIS_LIMITS.gramsMax) {
      return { ok: false, error: "食材克重不正确" };
    }
    ingredients.push({ name, grams });
  }
  return { ok: true, value: ingredients };
}

/** Model output is stored only after this numeric contract passes. */
export function validateAnalysis(input: unknown): ContractResult<ValidAnalysis> {
  if (!input || typeof input !== "object") return { ok: false, error: "分析结果不正确" };
  const row = input as Record<string, unknown>;
  const food = text(row.food ?? row.food_name, ANALYSIS_LIMITS.foodNameMax);
  if (!food || /^(未知食物|未知菜品|unknown|unknown food)$/i.test(food)) {
    return { ok: false, error: "没能识别这餐" };
  }

  const ingredients = validateIngredientList(row.ingredients);
  if (ingredients.ok === false) return { ok: false, error: ingredients.error };

  const calories = finite(row.calories);
  const protein = finite(row.protein_g);
  const fat = finite(row.fat_g);
  const carbs = finite(row.carbs_g);
  if (
    calories == null || protein == null || fat == null || carbs == null ||
    calories <= 0 || calories > ANALYSIS_LIMITS.caloriesMax ||
    protein < 0 || fat < 0 || carbs < 0 ||
    protein > ANALYSIS_LIMITS.macroMax || fat > ANALYSIS_LIMITS.macroMax || carbs > ANALYSIS_LIMITS.macroMax
  ) {
    return { ok: false, error: "营养数字不正确" };
  }

  const atwater = protein * 4 + fat * 9 + carbs * 4;
  if (!Number.isFinite(atwater) || atwater <= 0 || atwater < calories * 0.5 || atwater > calories * 1.5) {
    return { ok: false, error: "营养数字对不上" };
  }

  const verdict = typeof row.verdict === "string" ? row.verdict.trim().slice(0, 500) : "";
  const suggestion = typeof row.suggestion === "string" ? row.suggestion.trim().slice(0, 500) : "";
  return {
    ok: true,
    value: {
      food,
      calories: Math.round(calories),
      protein_g: protein,
      fat_g: fat,
      carbs_g: carbs,
      ingredients: ingredients.value,
      verdict,
      suggestion,
    },
  };
}
