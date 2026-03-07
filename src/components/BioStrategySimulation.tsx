import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DishInfo {
  name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  cookMethod?: string;
}

interface IngredientInfo {
  name: string;
  grams: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  calories?: number;
  cookMethod?: string;
}

interface TodayMeal {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  recorded_at?: string;
}

type DigestDifficulty = "easy" | "moderate" | "hard";
export type SequenceQuality = "optimal" | "moderate" | "poor";

// ── Science-based Digestion Data ───────────────────────────────────────────────

// Gastric emptying times based on clinical research (Mayo Clinic, NCBI gastroenterology studies)
// Values = approximate stomach emptying time in minutes

type FoodCategory = "water" | "fruit" | "vegetable" | "grain" | "legume" | "seafood" | "poultry" | "egg" | "redmeat" | "fatmeat" | "dairy" | "nut" | "soup" | "congee" | "salad" | "tofu" | "other";

const DIGEST_DATA: Record<FoodCategory, { minMin: number; icon: string; zhName: string; enName: string; recommendedGrams: number }> = {
  water:     { minMin: 15,  icon: "💧", zhName: "水/饮料",    enName: "Water/Drinks",    recommendedGrams: 200 },
  soup:      { minMin: 30,  icon: "🍲", zhName: "汤类",      enName: "Soup",            recommendedGrams: 250 },
  fruit:     { minMin: 40,  icon: "🍎", zhName: "水果",      enName: "Fruits",          recommendedGrams: 200 },
  congee:    { minMin: 45,  icon: "🥣", zhName: "粥类",      enName: "Congee/Porridge", recommendedGrams: 300 },
  salad:     { minMin: 45,  icon: "🥗", zhName: "沙拉/凉拌",  enName: "Salad",           recommendedGrams: 200 },
  vegetable: { minMin: 50,  icon: "🥬", zhName: "蔬菜",      enName: "Vegetables",      recommendedGrams: 200 },
  grain:     { minMin: 90,  icon: "🍚", zhName: "主食/谷物",  enName: "Grains/Rice",     recommendedGrams: 150 },
  tofu:      { minMin: 90,  icon: "🧈", zhName: "豆制品",    enName: "Tofu/Soy",        recommendedGrams: 150 },
  legume:    { minMin: 100, icon: "🫘", zhName: "豆类",      enName: "Legumes",         recommendedGrams: 100 },
  egg:       { minMin: 105, icon: "🥚", zhName: "蛋类",      enName: "Eggs",            recommendedGrams: 100 },
  dairy:     { minMin: 120, icon: "🧀", zhName: "乳制品",    enName: "Dairy",           recommendedGrams: 150 },
  seafood:   { minMin: 120, icon: "🐟", zhName: "海鲜/鱼类",  enName: "Seafood/Fish",    recommendedGrams: 150 },
  poultry:   { minMin: 150, icon: "🍗", zhName: "禽肉",      enName: "Poultry",         recommendedGrams: 120 },
  nut:       { minMin: 180, icon: "🥜", zhName: "坚果",      enName: "Nuts",            recommendedGrams: 30 },
  redmeat:   { minMin: 210, icon: "🥩", zhName: "红肉",      enName: "Red Meat",        recommendedGrams: 100 },
  fatmeat:   { minMin: 270, icon: "🍖", zhName: "肥肉/油炸",  enName: "Fatty/Fried",     recommendedGrams: 80 },
  other:     { minMin: 120, icon: "🍽", zhName: "其他",      enName: "Other",           recommendedGrams: 150 },
};

/** Classify ingredient name into a food category */
function classifyFood(name: string): FoodCategory {
  const l = name.toLowerCase();
  if (/水|茶|咖啡|果汁|饮料|奶茶|water|tea|coffee|juice|drink|cola|soda/.test(l)) return "water";
  if (/汤|broth|soup|羹/.test(l)) return "soup";
  if (/粥|congee|porridge|糊/.test(l)) return "congee";
  if (/苹果|梨|桃|橙|柑|橘|柚|葡萄|香蕉|芒果|草莓|蓝莓|西瓜|哈密瓜|猕猴桃|樱桃|荔枝|龙眼|榴莲|菠萝|木瓜|火龙果|石榴|杏|李|枣|柿|水果|fruit|apple|pear|peach|orange|grape|banana|mango|strawberry|blueberry|watermelon|melon|kiwi|cherry|lychee|pineapple|papaya|berry|plum/.test(l)) return "fruit";
  if (/沙拉|salad|凉拌/.test(l)) return "salad";
  if (/菜|蔬|瓜|丝瓜|黄瓜|苦瓜|冬瓜|南瓜|茄子|番茄|西红柿|白菜|菠菜|芹菜|西兰花|花菜|豆角|青椒|辣椒|生菜|莴笋|韭菜|藕|萝卜|竹笋|木耳|蘑菇|香菇|金针菇|秋葵|芦笋|vegetable|greens|broccoli|spinach|cabbage|lettuce|cucumber|tomato|pepper|carrot|celery|mushroom|eggplant|zucchini|corn|asparagus|okra/.test(l)) return "vegetable";
  if (/豆腐|豆干|豆皮|腐竹|tofu|bean curd/.test(l)) return "tofu";
  if (/饭|米|面|馒头|包子|饺子|馄饨|面包|吐司|面条|河粉|米粉|年糕|烧饼|饼|薯|芋|红薯|土豆|rice|noodle|pasta|bread|toast|dumpling|bun|wheat|oat|cereal|pancake|potato|yam/.test(l)) return "grain";
  if (/豆(?!腐|干|皮)|绿豆|红豆|黄豆|黑豆|扁豆|鹰嘴豆|bean|lentil|chickpea|legume/.test(l)) return "legume";
  if (/蛋|egg/.test(l)) return "egg";
  if (/奶|乳|酸奶|芝士|cheese|milk|yogurt|cream|butter|dairy/.test(l)) return "dairy";
  if (/鱼|虾|蟹|蛤|贝|海鲜|鳗|鱿鱼|章鱼|三文鱼|金枪鱼|fish|shrimp|prawn|crab|clam|oyster|mussel|squid|octopus|salmon|tuna|seafood|lobster/.test(l)) return "seafood";
  if (/鸡|鸭|鹅|鸽|chicken|duck|goose|turkey|poultry/.test(l)) return "poultry";
  if (/坚果|核桃|杏仁|花生|腰果|开心果|松子|瓜子|nut|walnut|almond|peanut|cashew|pistachio|seed/.test(l)) return "nut";
  if (/肥|五花|扣肉|猪蹄|炸|油炸|fried|deep.?fr/.test(l)) return "fatmeat";
  if (/猪|牛|羊|排骨|肉|pork|beef|lamb|mutton|steak|rib|meat/.test(l)) return "redmeat";
  return "other";
}

/** Filter out condiments, oils, seasonings */
function isDish(name: string): boolean {
  const l = name.toLowerCase();
  if (/油|酱|盐|糖|醋|料酒|葱|姜|蒜|辣椒粉|胡椒|香料|调料|味精|酱油|蚝油|花椒/.test(l)) return false;
  if (/^(oil|salt|sugar|pepper|sauce|vinegar|garlic|ginger|scallion|chili|spice|seasoning|soy sauce|oyster sauce|msg|cooking wine)/i.test(l)) return false;
  return true;
}

function getDifficulty(minMin: number): DigestDifficulty {
  if (minMin <= 60) return "easy";
  if (minMin <= 150) return "moderate";
  return "hard";
}

function calcDigestScore(dish: DishInfo): number {
  const cat = classifyFood(dish.name);
  const data = DIGEST_DATA[cat];
  return Math.max(1, Math.min(10, Math.round(10 - (data.minMin / 30))));
}

function getStomachTime(_score: number, name: string): number {
  return DIGEST_DATA[classifyFood(name)].minMin;
}

function getDishIcon(name: string): string {
  return DIGEST_DATA[classifyFood(name)].icon;
}

interface OrderedDish {
  name: string;
  score: number;
  difficulty: DigestDifficulty;
  stomachMin: number;
  icon: string;
  isCurrent?: boolean;
  recommendedGrams: number;
}

/** Group ingredients by food category, merge similar items */
function groupByCategory(ingredients: IngredientInfo[], isZh: boolean): OrderedDish[] {
  const filtered = ingredients.filter(ing => isDish(ing.name));
  const source = filtered.length > 0 ? filtered : ingredients;

  const catMap = new Map<FoodCategory, string[]>();
  source.forEach(ing => {
    const cat = classifyFood(ing.name);
    const existing = catMap.get(cat) || [];
    existing.push(ing.name);
    catMap.set(cat, existing);
  });

  const dishes: OrderedDish[] = [];
  catMap.forEach((names, cat) => {
    const data = DIGEST_DATA[cat];
    const displayName = names.length > 1
      ? (isZh ? data.zhName : data.enName)
      : names[0];
    dishes.push({
      name: displayName,
      score: Math.max(1, Math.min(10, Math.round(10 - (data.minMin / 30)))),
      stomachMin: data.minMin,
      difficulty: getDifficulty(data.minMin),
      icon: data.icon,
      isCurrent: false,
      recommendedGrams: data.recommendedGrams,
    });
  });

  return dishes.sort((a, b) => a.stomachMin - b.stomachMin);
}

const COLORS: Record<DigestDifficulty, { main: string; bg: string; glow: string; particle: string }> = {
  easy:     { main: "#39c864", bg: "rgba(57,200,100,0.12)", glow: "rgba(57,200,100,0.4)", particle: "rgba(57,200,100,0.6)" },
  moderate: { main: "#d4af37", bg: "rgba(212,175,55,0.12)", glow: "rgba(212,175,55,0.4)", particle: "rgba(212,175,55,0.6)" },
  hard:     { main: "#e53e3e", bg: "rgba(255,50,50,0.12)",  glow: "rgba(255,50,50,0.4)",  particle: "rgba(255,50,50,0.6)" },
};

// ── Combined Digestive Flow + Order ───────────────────────────────────────────

function DigestiveFlow({ dishes, entered, t }: { dishes: OrderedDish[]; entered: boolean; t: any }) {
  if (dishes.length === 0) return null;

  const hasBlockage = dishes.length > 0 && dishes[dishes.length - 1]?.difficulty === "hard";
  const congestionLevel = dishes.reduce((acc, d, i) => {
    if (d.difficulty === "hard" && i > dishes.length * 0.5) return acc + 0.3;
    return acc;
  }, 0);
  const isBlocked = congestionLevel > 0.3;

  return (
    <div className="relative">
      {/* Flow status badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-semibold text-muted-foreground">🍽 {t.digestOrderTitle}</p>
        <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
          isBlocked
            ? "bg-destructive/10 text-destructive border border-destructive/30"
            : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30"
        }`}>
          {isBlocked ? "⛔ 堵塞风险" : "✓ 通畅"}
        </div>
      </div>

      {/* Combined flow + order list */}
      <div className="relative pl-6">
        {/* Vertical flow line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-[2px] rounded-full overflow-hidden"
          style={{ background: "hsl(var(--border) / 0.2)" }}>
          {entered && (
            <div
              className="w-full rounded-full"
              style={{
                height: "30%",
                background: isBlocked
                  ? "linear-gradient(to bottom, transparent, #e53e3e, transparent)"
                  : "linear-gradient(to bottom, transparent, #39c864, transparent)",
                animation: `flowDown ${isBlocked ? "3s" : "2s"} ease-in-out infinite`,
              }}
            />
          )}
        </div>

        {/* Dish items along the flow */}
        <div className="space-y-1">
          {dishes.map((d, i) => {
            const c = COLORS[d.difficulty];
            const isLast = i === dishes.length - 1;
            return (
              <div
                key={`flow-${d.name}-${i}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all relative"
                style={{
                  opacity: entered ? 1 : 0,
                  transform: entered ? "translateX(0)" : "translateX(-12px)",
                  transition: `all 0.5s ease-out ${i * 0.12}s`,
                  background: c.bg,
                  border: `1px solid ${c.main}22`,
                }}
              >
                {/* Flow node dot on the line */}
                <div className="absolute -left-[15px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: c.bg, border: `2px solid ${c.main}`, boxShadow: `0 0 8px ${c.glow}` }}>
                  <span className="text-[8px] font-black" style={{ color: c.main }}>{i + 1}</span>
                </div>

                {/* Icon */}
                <span className="text-base shrink-0">{d.icon}</span>

                {/* Name + difficulty */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-card-foreground truncate">{d.name}</p>
                  <p className="text-[8px] font-mono" style={{ color: c.main }}>
                    {d.difficulty === "easy" ? "易消化" : d.difficulty === "moderate" ? "中等" : "难消化"}
                  </p>
                </div>

                {/* Recommended grams */}
                <span className="text-[8px] font-mono text-muted-foreground/70 shrink-0 px-1.5 py-0.5 rounded-md bg-background/50">
                  ≈{d.recommendedGrams}g
                </span>

                {/* Digestion time */}
                <div className="text-center shrink-0 min-w-[36px]">
                  <p className="text-[11px] font-black font-mono leading-none" style={{ color: c.main }}>{d.stomachMin}</p>
                  <p className="text-[6px] font-mono text-muted-foreground/40">{t.digestMinUnit}</p>
                </div>

                {/* Flow arrow to next */}
                {!isLast && entered && (
                  <div className="absolute -bottom-1.5 left-[9px] -translate-x-1/2 text-muted-foreground/20 text-[10px] z-10"
                    style={{ left: "-6px" }}>
                    ▼
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Absorption endpoint */}
        <div className="flex items-center gap-2 mt-2 ml-[-4px]">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{
              background: isBlocked ? "rgba(255,50,50,0.1)" : "rgba(57,200,100,0.1)",
              border: `2px solid ${isBlocked ? "#e53e3e" : "#39c864"}`,
            }}>
            {isBlocked ? "⚠️" : "✅"}
          </div>
          <span className="text-[8px] font-mono" style={{ color: isBlocked ? "#e53e3e" : "#39c864" }}>
            {isBlocked ? "消化拥堵" : "顺畅吸收"}
          </span>
        </div>
      </div>

      <p className="text-[8px] text-muted-foreground/50 mt-3 leading-relaxed">
        💡 {t.digestOrderAdvice}
      </p>

      {/* CSS animation for flow */}
      <style>{`
        @keyframes flowDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
      `}</style>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  dish: DishInfo;
  ingredients?: IngredientInfo[];
  todayMeals?: TodayMeal[];
  visible: boolean;
  onSequenceQualityChange?: (quality: SequenceQuality) => void;
}

export default function BioStrategySimulation({ dish, ingredients = [], todayMeals = [], visible, onSequenceQualityChange }: Props) {
  const { t, locale } = useI18n();
  const isZh = locale === "zh-CN";
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const timer = setTimeout(() => setEntered(true), 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const digestScore = useMemo(() => calcDigestScore(dish), [dish]);
  const catData = DIGEST_DATA[classifyFood(dish.name)];
  const difficulty = getDifficulty(catData.minMin);
  const stomachMin = catData.minMin;
  const colors = COLORS[difficulty];

  // Build ordered dish list — group by food category, use science-based digestion times
  const orderedDishes = useMemo((): OrderedDish[] => {
    if (ingredients.length > 1) {
      return groupByCategory(ingredients, isZh);
    }

    // Fallback: today's meals + current dish
    const allDishes: OrderedDish[] = [];
    todayMeals.forEach(m => {
      const cat = classifyFood(m.food_name);
      const data = DIGEST_DATA[cat];
      allDishes.push({
        name: m.food_name, score: Math.max(1, Math.min(10, Math.round(10 - (data.minMin / 30)))),
        difficulty: getDifficulty(data.minMin),
        stomachMin: data.minMin, icon: data.icon, isCurrent: false,
        recommendedGrams: data.recommendedGrams,
      });
    });

    allDishes.push({
      name: dish.name, score: digestScore, difficulty, stomachMin,
      icon: getDishIcon(dish.name), isCurrent: true,
      recommendedGrams: catData.recommendedGrams,
    });

    return allDishes.sort((a, b) => a.stomachMin - b.stomachMin);
  }, [ingredients, todayMeals, dish, digestScore, difficulty, stomachMin, isZh, catData]);

  const sequenceQuality = useMemo((): SequenceQuality => {
    if (orderedDishes.length <= 1) return difficulty === "hard" ? "moderate" : "optimal";
    const currentIdx = orderedDishes.findIndex(d => d.isCurrent);
    const idealIdx = [...orderedDishes].sort((a, b) => b.score - a.score).findIndex(d => d.isCurrent);
    if (currentIdx === idealIdx) return "optimal";
    if (Math.abs(currentIdx - idealIdx) <= 1) return "moderate";
    return "poor";
  }, [orderedDishes, difficulty]);

  useEffect(() => {
    onSequenceQualityChange?.(sequenceQuality);
  }, [sequenceQuality, onSequenceQualityChange]);

  if (!visible) return null;

  const diffLabel = difficulty === "easy" ? t.digestEasy : difficulty === "moderate" ? t.digestModerate : t.digestHard;
  const diffDesc = difficulty === "easy" ? t.digestEasyDesc : difficulty === "moderate" ? t.digestModerateDesc : t.digestHardDesc;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.bioStrategyTitle} <span className="flex-1 h-px bg-border" />
      </h3>

      <div className={`glass rounded-2xl p-4 shadow-card relative overflow-hidden transition-all duration-500 ${
        difficulty === "hard" ? "ring-1 ring-destructive/30" : ""
      }`}>

        {/* ─── Dish Header ─── */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: colors.bg, border: `1.5px solid ${colors.main}33`, boxShadow: `0 4px 12px ${colors.glow}` }}
          >
            {getDishIcon(dish.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-card-foreground truncate">{dish.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: colors.bg, color: colors.main, border: `1px solid ${colors.main}33` }}>
                {diffLabel}
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/50">
                {t.digestScoreLabel} {digestScore}/10
              </span>
            </div>
          </div>
          <div className="text-center shrink-0">
            <p className="text-xl font-black font-mono leading-none" style={{ color: colors.main }}>{stomachMin}</p>
            <p className="text-[7px] font-mono text-muted-foreground/50 mt-0.5">{t.digestMinUnit}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[10px] leading-relaxed text-muted-foreground mb-4">
          {difficulty === "easy" ? "✅" : difficulty === "moderate" ? "⚡" : "⚠️"} {diffDesc}
        </p>

        {/* ─── Combined Flow + Order ─── */}
        {orderedDishes.length > 1 && (
          <DigestiveFlow dishes={orderedDishes} entered={entered} t={t} />
        )}

        {/* ─── Tactical Advice ─── */}
        <div className={`rounded-xl p-3 border transition-all duration-500 mt-3 ${
          difficulty === "hard" ? "border-destructive/30 bg-destructive/5" : "border-border/30 glass"
        }`}>
          <p className={`text-[10px] leading-relaxed ${
            difficulty === "hard" ? "text-destructive font-bold" : "text-muted-foreground"
          }`}>
            {difficulty === "easy" ? "✅" : difficulty === "moderate" ? "⚡" : "⚠️"}{" "}
            {difficulty === "easy" ? t.digestAdviceEasy : difficulty === "moderate" ? t.digestAdviceModerate : t.digestAdviceHard}
          </p>
        </div>
      </div>
    </section>
  );
}
