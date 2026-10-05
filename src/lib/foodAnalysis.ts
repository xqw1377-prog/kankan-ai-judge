export interface FoodIngredient {
  name: string;
  grams: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  calories?: number;
  gi?: number;
  gl?: number;
  oilG?: number;
  fiber?: number;
}

export interface FoodAnalysis {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients: FoodIngredient[];
  verdict: string;
  suggestion: string;
  cooking_scene?: string;
  roast?: string;
  gi_value?: number;
}

export type AnalysisCode = "missing_key" | "unavailable" | "unrecognized";

const PLACEHOLDER_VERDICTS = new Set(["ai error", "network error"]);
const PLACEHOLDER_NAMES = new Set(["未知食物", "unknown", "unknown food"]);

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function isPlaceholderAnalysis(data: unknown): boolean {
  if (!data || typeof data !== "object") return true;
  const row = data as Record<string, unknown>;
  if (typeof row.error === "string" && row.error.trim()) return true;

  const verdict = String(row.verdict ?? "").trim().toLowerCase();
  if (PLACEHOLDER_VERDICTS.has(verdict)) return true;

  const food = String(row.food ?? row.food_name ?? "").trim();
  const calories = num(row.calories);
  const protein = num(row.protein_g);
  const fat = num(row.fat_g);
  const carbs = num(row.carbs_g);
  const hasMacros = calories > 0 || protein > 0 || fat > 0 || carbs > 0;

  if (!food || PLACEHOLDER_NAMES.has(food.toLowerCase())) return true;
  if (!hasMacros) return true;
  return false;
}

export function toFoodAnalysis(data: unknown): FoodAnalysis | null {
  if (isPlaceholderAnalysis(data)) return null;
  const row = data as Record<string, unknown>;
  const ingredients = Array.isArray(row.ingredients)
    ? row.ingredients.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const ing = item as Record<string, unknown>;
        const name = String(ing.name ?? "").trim();
        if (!name) return [];
        return [{
          name,
          grams: num(ing.grams ?? ing.weight),
          protein: num(ing.protein),
          fat: num(ing.fat),
          carbs: num(ing.carbs),
          calories: num(ing.calories),
          gi: num(ing.gi),
          gl: num(ing.gl),
          oilG: num(ing.oil_g ?? ing.oilG),
          fiber: num(ing.fiber),
        }];
      })
    : [];

  return {
    food: String(row.food ?? row.food_name).trim(),
    calories: num(row.calories),
    protein_g: num(row.protein_g),
    fat_g: num(row.fat_g),
    carbs_g: num(row.carbs_g),
    ingredients,
    verdict: String(row.verdict ?? ""),
    suggestion: String(row.suggestion ?? ""),
    cooking_scene: typeof row.cooking_scene === "string" ? row.cooking_scene : undefined,
    roast: typeof row.roast === "string" ? row.roast : undefined,
    gi_value: row.gi_value == null ? undefined : num(row.gi_value),
  };
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function failureCodeFromMessage(message: string, hasClientKey: boolean): AnalysisCode {
  if (/LOVABLE_API_KEY|not configured|api[_ ]?key/i.test(message)) {
    return hasClientKey ? "unavailable" : "missing_key";
  }
  return "unavailable";
}

export interface AuditIngredient {
  name: string;
  grams: number;
  gi: number;
  gl: number;
  oilG: number;
  protein: number;
  fat: number;
  fiber: number;
}

export function toAuditIngredients(data: unknown): AuditIngredient[] {
  if (!data || typeof data !== "object") return [];
  const row = data as Record<string, unknown>;
  if (typeof row.error === "string" && row.error.trim()) return [];
  if (!Array.isArray(row.ingredients)) return [];
  return row.ingredients.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const ing = item as Record<string, unknown>;
    const name = String(ing.name ?? "").trim();
    if (!name) return [];
    return [{
      name,
      grams: num(ing.grams ?? ing.weight),
      gi: num(ing.gi),
      gl: num(ing.gl),
      oilG: num(ing.oil_g ?? ing.oilG),
      protein: num(ing.protein),
      fat: num(ing.fat),
      fiber: num(ing.fiber),
    }];
  });
}
