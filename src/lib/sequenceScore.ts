/**
 * Compute a per-meal sequence score (0-100) based on ingredient composition.
 * Evaluates whether the eating order follows the optimal pattern:
 * Vegetables/Fiber → Protein → Carbs/Starches
 */

interface IngredientLike {
  name: string;
  grams: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  calories?: number;
}

type IngCategory = "fiber" | "protein" | "carb" | "mixed";

function categorize(ing: IngredientLike): IngCategory {
  const p = ing.protein || 0;
  const f = ing.fat || 0;
  const c = ing.carbs || 0;
  const total = p + f + c || 1;

  const lower = ing.name.toLowerCase();

  // Name-based hints
  if (/菜|蔬|叶|菠|芹|瓜|豆角|笋|broccoli|spinach|lettuce|vegetable|greens|salad|soup|汤/.test(lower)) return "fiber";
  if (/米|饭|面|粉|麦|bread|rice|noodle|pasta|馒头|包子|饺子/.test(lower)) return "carb";
  if (/鸡|鸭|鹅|猪|牛|羊|肉|鱼|虾|蟹|蛋|chicken|duck|pork|beef|lamb|fish|shrimp|egg|meat/.test(lower)) return "protein";

  // Macro-based fallback
  if (c / total > 0.6) return "carb";
  if (p / total > 0.4) return "protein";
  if (f / total > 0.5) return "mixed";

  return "mixed";
}

const IDEAL_ORDER: Record<IngCategory, number> = {
  fiber: 0,
  protein: 1,
  mixed: 1.5,
  carb: 2,
};

/**
 * Score the ingredient list as if eaten top-to-bottom.
 * Returns 0-100 where 100 = perfect order (fiber → protein → carbs).
 */
export function computeSequenceScore(ingredients: IngredientLike[]): number {
  if (ingredients.length <= 1) return 80; // Single ingredient = decent by default

  const categories = ingredients.map(categorize);

  // Check pairwise order violations
  let violations = 0;
  let comparisons = 0;

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      comparisons++;
      const idealI = IDEAL_ORDER[categories[i]];
      const idealJ = IDEAL_ORDER[categories[j]];
      if (idealI > idealJ) violations++; // Wrong order
    }
  }

  if (comparisons === 0) return 80;

  const orderScore = Math.round((1 - violations / comparisons) * 100);

  // Bonus: fiber in first position
  const fiberFirst = categories[0] === "fiber" ? 10 : 0;
  // Penalty: carb in first position
  const carbFirst = categories[0] === "carb" ? -15 : 0;

  return Math.max(0, Math.min(100, orderScore + fiberFirst + carbFirst));
}

export type SequenceGrade = "perfect" | "good" | "suboptimal" | "poor";

export function getSequenceGrade(score: number): SequenceGrade {
  if (score >= 85) return "perfect";
  if (score >= 60) return "good";
  if (score >= 40) return "suboptimal";
  return "poor";
}

export function getSequenceGradeInfo(grade: SequenceGrade, isZh: boolean) {
  const map: Record<SequenceGrade, { label: string; icon: string; color: string }> = {
    perfect: {
      label: isZh ? "完美时序" : "Perfect",
      icon: "🏆",
      color: "hsl(var(--success))",
    },
    good: {
      label: isZh ? "良好" : "Good",
      icon: "✅",
      color: "hsl(var(--primary))",
    },
    suboptimal: {
      label: isZh ? "可优化" : "Suboptimal",
      icon: "⚡",
      color: "hsl(var(--warning))",
    },
    poor: {
      label: isZh ? "需改进" : "Needs Work",
      icon: "⚠️",
      color: "hsl(var(--destructive))",
    },
  };
  return map[grade];
}
