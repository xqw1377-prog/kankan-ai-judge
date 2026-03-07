import { useMemo, useState, useEffect, useRef } from "react";
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

// ── Digestibility Engine ───────────────────────────────────────────────────────

function calcDigestScore(dish: DishInfo): number {
  const total = dish.calories || 1;
  const fatRatio = (dish.fat_g * 9) / total;
  const proteinRatio = (dish.protein_g * 4) / total;
  const carbRatio = (dish.carbs_g * 4) / total;
  const name = dish.name.toLowerCase();
  let score = 6;
  if (/汤|粥|soup|congee|broth|羹/.test(name)) score += 3;
  if (/沙拉|salad|凉拌/.test(name)) score += 2;
  if (/菜|蔬|vegetable|greens|青/.test(name)) score += 2;
  if (/蒸|steam/.test(name)) score += 1;
  if (/炸|fried|煎|炒|烤|grill|bbq|烧烤/.test(name)) score -= 2;
  if (/红烧|braised|卤|焖/.test(name)) score -= 1.5;
  if (/火锅|hotpot/.test(name)) score -= 1;
  if (/奶油|cream|芝士|cheese|披萨|pizza/.test(name)) score -= 2;
  if (/肥|五花|排骨|rib|猪蹄/.test(name)) score -= 2;
  if (dish.cookMethod === "deepfry") score -= 2;
  if (dish.cookMethod === "braised") score -= 1;
  if (dish.cookMethod === "steam") score += 1;
  if (fatRatio > 0.5) score -= 2;
  else if (fatRatio > 0.35) score -= 1;
  if (proteinRatio > 0.5) score -= 0.5;
  if (carbRatio > 0.7 && fatRatio < 0.15) score += 1;
  if (dish.calories > 800) score -= 1;
  if (dish.calories < 200) score += 1;
  return Math.max(1, Math.min(10, Math.round(score)));
}

function getDifficulty(score: number): DigestDifficulty {
  if (score >= 7) return "easy";
  if (score >= 4) return "moderate";
  return "hard";
}

function getStomachTime(score: number): number {
  return Math.round(240 - (score - 1) * 23);
}

function getDishIcon(name: string): string {
  const l = name.toLowerCase();
  if (/汤|soup|broth|羹/.test(l)) return "🍲";
  if (/粥|congee/.test(l)) return "🥣";
  if (/沙拉|salad/.test(l)) return "🥗";
  if (/菜|蔬|vegetable|greens/.test(l)) return "🥬";
  if (/鸡|chicken/.test(l)) return "🍗";
  if (/鱼|fish/.test(l)) return "🐟";
  if (/虾|shrimp/.test(l)) return "🦐";
  if (/牛|beef/.test(l)) return "🥩";
  if (/猪|pork|排骨|rib/.test(l)) return "🍖";
  if (/面|noodle|pasta/.test(l)) return "🍜";
  if (/饭|rice/.test(l)) return "🍚";
  if (/蛋|egg/.test(l)) return "🥚";
  if (/炸|fried/.test(l)) return "🍳";
  if (/火锅|hotpot/.test(l)) return "♨️";
  return "🍽";
}

interface OrderedDish {
  name: string;
  score: number;
  difficulty: DigestDifficulty;
  stomachMin: number;
  icon: string;
  isCurrent?: boolean;
  recommendedGrams?: number;
}

/** Filter out condiments, oils, seasonings — keep only actual dishes/foods */
function isDish(name: string): boolean {
  const l = name.toLowerCase();
  // Exclude common condiments, oils, seasonings, sauces
  if (/油|酱|盐|糖|醋|料酒|葱|姜|蒜|辣椒粉|胡椒|香料|调料|味精|酱油|蚝油|花椒/.test(l)) return false;
  if (/^(oil|salt|sugar|pepper|sauce|vinegar|garlic|ginger|scallion|chili|spice|seasoning|soy sauce|oyster sauce|msg|cooking wine)/i.test(l)) return false;
  return true;
}

/** Estimate recommended serving grams based on food type */
function getRecommendedGrams(name: string, calories: number): number {
  const l = name.toLowerCase();
  if (/汤|soup|broth|羹/.test(l)) return 250;
  if (/粥|congee/.test(l)) return 300;
  if (/沙拉|salad/.test(l)) return 200;
  if (/菜|蔬|vegetable|greens|青|瓜|豆角|西兰花|白菜|菠菜|芹菜/.test(l)) return 200;
  if (/饭|rice/.test(l)) return 150;
  if (/面|noodle|pasta/.test(l)) return 200;
  if (/鸡胸|chicken breast/.test(l)) return 120;
  if (/鸡|chicken/.test(l)) return 150;
  if (/鱼|fish/.test(l)) return 150;
  if (/虾|shrimp/.test(l)) return 100;
  if (/牛|beef/.test(l)) return 120;
  if (/猪|pork|扣肉|排骨|rib/.test(l)) return 100;
  if (/蛋|egg/.test(l)) return 100;
  if (/豆腐|tofu/.test(l)) return 150;
  // Default: estimate from calories
  if (calories > 400) return 100;
  if (calories > 200) return 150;
  return 180;
}

const COLORS: Record<DigestDifficulty, { main: string; bg: string; glow: string; particle: string }> = {
  easy:     { main: "#39c864", bg: "rgba(57,200,100,0.12)", glow: "rgba(57,200,100,0.4)", particle: "rgba(57,200,100,0.6)" },
  moderate: { main: "#d4af37", bg: "rgba(212,175,55,0.12)", glow: "rgba(212,175,55,0.4)", particle: "rgba(212,175,55,0.6)" },
  hard:     { main: "#e53e3e", bg: "rgba(255,50,50,0.12)",  glow: "rgba(255,50,50,0.4)",  particle: "rgba(255,50,50,0.6)" },
};

// ── Animated Digestive Tract SVG ───────────────────────────────────────────────

function DigestiveTract({ dishes, entered }: { dishes: OrderedDish[]; entered: boolean }) {
  const totalHeight = Math.max(320, dishes.length * 70 + 180);
  const tractWidth = 60;
  const centerX = 100;

  // Tract sections
  const mouthY = 20;
  const stomachTopY = 60;
  const stomachBottomY = stomachTopY + Math.max(120, dishes.length * 50 + 20);
  const intestineY = stomachBottomY + 40;
  const exitY = intestineY + 60;

  // Calculate congestion: hard dishes near top = blockage
  const hasBlockage = dishes.length > 0 && dishes[0].difficulty === "hard";
  const congestionLevel = dishes.reduce((acc, d, i) => {
    if (d.difficulty === "hard" && i < dishes.length * 0.5) return acc + 0.3;
    if (d.difficulty === "moderate" && i < dishes.length * 0.3) return acc + 0.1;
    return acc;
  }, 0);
  const isBlocked = congestionLevel > 0.3;
  const flowSpeed = isBlocked ? 8 : congestionLevel > 0.15 ? 5 : 3;

  return (
    <div className="relative w-full" style={{ height: totalHeight }}>
      <svg
        viewBox={`0 0 200 ${totalHeight}`}
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.1))" }}
      >
        <defs>
          {/* Tract gradient */}
          <linearGradient id="tractGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.08" />
            <stop offset="50%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.03" />
          </linearGradient>
          {/* Flow particles */}
          <linearGradient id="flowGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#39c864" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#39c864" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="flowRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e53e3e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e53e3e" stopOpacity="0.05" />
          </linearGradient>
          {/* Blockage pattern */}
          <pattern id="blockagePattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="8" x2="8" y2="0" stroke="#e53e3e" strokeWidth="0.8" opacity="0.2" />
          </pattern>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Mouth entrance ── */}
        <path
          d={`M ${centerX - 25} ${mouthY} Q ${centerX} ${mouthY - 8} ${centerX + 25} ${mouthY}`}
          fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.2"
        />
        <text x={centerX} y={mouthY - 12} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.4" fontFamily="monospace">
          ▼ INTAKE
        </text>

        {/* ── Esophagus (narrow tube) ── */}
        <rect
          x={centerX - 12} y={mouthY + 2} width={24} height={stomachTopY - mouthY - 2}
          rx="8" fill="url(#tractGrad)" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.6"
        />
        {/* Flow animation in esophagus */}
        {entered && (
          <rect x={centerX - 6} y={mouthY + 4} width={12} height={8} rx="4" opacity="0.3"
            fill={isBlocked ? "#e53e3e" : "#39c864"}>
            <animate attributeName="y" values={`${mouthY + 4};${stomachTopY - 10};${mouthY + 4}`}
              dur={`${flowSpeed * 0.5}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur={`${flowSpeed * 0.5}s`} repeatCount="indefinite" />
          </rect>
        )}

        {/* ── Stomach (wide chamber) ── */}
        <path
          d={`M ${centerX - 12} ${stomachTopY}
              Q ${centerX - tractWidth} ${stomachTopY + 20} ${centerX - tractWidth} ${(stomachTopY + stomachBottomY) / 2}
              Q ${centerX - tractWidth} ${stomachBottomY - 20} ${centerX - 15} ${stomachBottomY}
              L ${centerX + 15} ${stomachBottomY}
              Q ${centerX + tractWidth} ${stomachBottomY - 20} ${centerX + tractWidth} ${(stomachTopY + stomachBottomY) / 2}
              Q ${centerX + tractWidth} ${stomachTopY + 20} ${centerX + 12} ${stomachTopY}
              Z`}
          fill="url(#tractGrad)" stroke="hsl(var(--border))" strokeWidth="0.8" opacity="0.8"
        />

        {/* Blockage overlay */}
        {isBlocked && (
          <path
            d={`M ${centerX - 12} ${stomachTopY}
                Q ${centerX - tractWidth} ${stomachTopY + 20} ${centerX - tractWidth} ${(stomachTopY + stomachBottomY) / 2}
                Q ${centerX - tractWidth} ${stomachBottomY - 20} ${centerX - 15} ${stomachBottomY}
                L ${centerX + 15} ${stomachBottomY}
                Q ${centerX + tractWidth} ${stomachBottomY - 20} ${centerX + tractWidth} ${(stomachTopY + stomachBottomY) / 2}
                Q ${centerX + tractWidth} ${stomachTopY + 20} ${centerX + 12} ${stomachTopY}
                Z`}
            fill="url(#blockagePattern)" opacity="0.5"
          >
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
          </path>
        )}

        {/* Stomach label */}
        <text x={centerX + tractWidth + 8} y={(stomachTopY + stomachBottomY) / 2} fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.3" fontFamily="monospace" dominantBaseline="middle">
          胃 STOMACH
        </text>

        {/* ── Food layers in stomach ── */}
        {dishes.map((dish, i) => {
          const c = COLORS[dish.difficulty];
          const layerY = stomachTopY + 18 + i * 50;
          const layerWidth = tractWidth * 2 - 30;
          const layerX = centerX - layerWidth / 2;

          // Blocked items pile up and pulse red
          const isStuck = isBlocked && i > 0;
          const stuckDelay = isStuck ? i * 0.3 : 0;

          return (
            <g key={`${dish.name}-${i}`}
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(-20px)",
                transition: `all 0.6s ease-out ${i * 0.15}s`,
              }}
            >
              {/* Food layer block */}
              <rect
                x={layerX} y={layerY} width={layerWidth} height={38}
                rx="10" fill={c.bg}
                stroke={c.main} strokeWidth="1" strokeOpacity="0.4"
              />
              {/* Glow effect for current dish */}
              {dish.isCurrent && (
                <rect
                  x={layerX - 2} y={layerY - 2} width={layerWidth + 4} height={42}
                  rx="12" fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.3"
                  filter="url(#glow)"
                >
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Stuck/congestion warning shimmer */}
              {isStuck && (
                <rect x={layerX} y={layerY} width={layerWidth} height={38} rx="10"
                  fill="#e53e3e" opacity="0">
                  <animate attributeName="opacity" values="0;0.08;0" dur="1.5s" begin={`${stuckDelay}s`} repeatCount="indefinite" />
                </rect>
              )}

              {/* Emoji icon */}
              <text x={layerX + 14} y={layerY + 24} fontSize="16" textAnchor="middle" dominantBaseline="middle">
                {dish.icon}
              </text>

              {/* Dish name */}
              <text x={layerX + 30} y={layerY + 15} fontSize="9" fontWeight="bold"
                fill={dish.isCurrent ? c.main : "hsl(var(--card-foreground))"} dominantBaseline="middle">
                {dish.name.length > 8 ? dish.name.slice(0, 8) + "…" : dish.name}
              </text>

              {/* Digest time + difficulty badge */}
              <text x={layerX + 30} y={layerY + 28} fontSize="7" fontFamily="monospace" fill={c.main} opacity="0.8" dominantBaseline="middle">
                {dish.stomachMin}min
              </text>

              {/* Traffic light indicator */}
              <circle cx={layerX + layerWidth - 12} cy={layerY + 19} r="5" fill={c.main} opacity="0.7">
                {dish.difficulty === "hard" && entered && (
                  <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1s" repeatCount="indefinite" />
                )}
              </circle>
            </g>
          );
        })}

        {/* ── Stomach exit (pylorus) ── */}
        <rect
          x={centerX - 10} y={stomachBottomY} width={20} height={8}
          rx="3" fill={isBlocked ? "#e53e3e" : "#39c864"}
          opacity={isBlocked ? 0.3 : 0.4}
        >
          {isBlocked && (
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1s" repeatCount="indefinite" />
          )}
        </rect>
        {/* Gate status */}
        <text x={centerX + 20} y={stomachBottomY + 6} fontSize="6" fontFamily="monospace"
          fill={isBlocked ? "#e53e3e" : "#39c864"} opacity="0.6">
          {isBlocked ? "⛔ BLOCKED" : "✓ FLOWING"}
        </text>

        {/* ── Small intestine (wavy tube) ── */}
        <path
          d={`M ${centerX - 10} ${stomachBottomY + 8}
              Q ${centerX - 30} ${stomachBottomY + 25} ${centerX} ${stomachBottomY + 30}
              Q ${centerX + 30} ${stomachBottomY + 35} ${centerX} ${stomachBottomY + 45}
              Q ${centerX - 25} ${stomachBottomY + 55} ${centerX} ${intestineY}`}
          fill="none" stroke="hsl(var(--border))" strokeWidth="18" opacity="0.15" strokeLinecap="round"
        />
        <path
          d={`M ${centerX - 10} ${stomachBottomY + 8}
              Q ${centerX - 30} ${stomachBottomY + 25} ${centerX} ${stomachBottomY + 30}
              Q ${centerX + 30} ${stomachBottomY + 35} ${centerX} ${stomachBottomY + 45}
              Q ${centerX - 25} ${stomachBottomY + 55} ${centerX} ${intestineY}`}
          fill="none" stroke="hsl(var(--border))" strokeWidth="0.8" opacity="0.3" strokeLinecap="round"
        />
        {/* Flow particles in intestine */}
        {entered && !isBlocked && (
          <circle r="3" fill="#39c864" opacity="0.4">
            <animateMotion
              path={`M ${centerX - 10} ${stomachBottomY + 8}
                Q ${centerX - 30} ${stomachBottomY + 25} ${centerX} ${stomachBottomY + 30}
                Q ${centerX + 30} ${stomachBottomY + 35} ${centerX} ${stomachBottomY + 45}
                Q ${centerX - 25} ${stomachBottomY + 55} ${centerX} ${intestineY}`}
              dur={`${flowSpeed}s`} repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur={`${flowSpeed}s`} repeatCount="indefinite" />
          </circle>
        )}

        <text x={centerX + 35} y={(stomachBottomY + intestineY) / 2 + 5} fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.3" fontFamily="monospace" dominantBaseline="middle">
          小肠 INTESTINE
        </text>

        {/* ── Absorption exit ── */}
        <circle cx={centerX} cy={exitY} r="10" fill={isBlocked ? "rgba(255,50,50,0.1)" : "rgba(57,200,100,0.1)"}
          stroke={isBlocked ? "#e53e3e" : "#39c864"} strokeWidth="1" opacity="0.5" />
        <text x={centerX} y={exitY + 1} textAnchor="middle" fontSize="10" dominantBaseline="middle">
          {isBlocked ? "⚠️" : "✅"}
        </text>
        <text x={centerX} y={exitY + 18} textAnchor="middle" fontSize="7" fontFamily="monospace"
          fill={isBlocked ? "#e53e3e" : "#39c864"} opacity="0.5">
          {isBlocked ? "CONGESTED" : "ABSORBED"}
        </text>
      </svg>

      {/* Blockage warning overlay */}
      {isBlocked && entered && (
        <div className="absolute top-2 right-2 animate-fade-in">
          <div className="px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/30 backdrop-blur-sm">
            <p className="text-[8px] font-bold text-destructive">⛔ 堵塞风险</p>
          </div>
        </div>
      )}

      {/* Flow status overlay */}
      {!isBlocked && entered && (
        <div className="absolute top-2 right-2 animate-fade-in">
          <div className="px-2 py-1 rounded-lg bg-success/10 border border-success/30 backdrop-blur-sm">
            <p className="text-[8px] font-bold text-success">✓ 通畅</p>
          </div>
        </div>
      )}
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
  const { t } = useI18n();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const timer = setTimeout(() => setEntered(true), 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const digestScore = useMemo(() => calcDigestScore(dish), [dish]);
  const difficulty = getDifficulty(digestScore);
  const stomachMin = getStomachTime(digestScore);
  const colors = COLORS[difficulty];

  // Build ordered dish list — treat each dish as a whole unit, skip condiments/oils
  const orderedDishes = useMemo((): OrderedDish[] => {
    const allDishes: OrderedDish[] = [];

    // If we have ingredients, group by actual dishes (filter out oils/seasonings)
    if (ingredients.length > 1) {
      const dishes = ingredients.filter(ing => isDish(ing.name));
      // If filtering left nothing, use all
      const source = dishes.length > 0 ? dishes : ingredients;
      source.forEach(ing => {
        const ingAsDish: DishInfo = {
          name: ing.name,
          calories: ing.calories || Math.round((ing.protein || 0) * 4 + (ing.fat || 0) * 9 + (ing.carbs || 0) * 4),
          protein_g: ing.protein || 0,
          fat_g: ing.fat || 0,
          carbs_g: ing.carbs || 0,
          cookMethod: ing.cookMethod,
        };
        const s = calcDigestScore(ingAsDish);
        allDishes.push({
          name: ing.name,
          score: s,
          difficulty: getDifficulty(s),
          stomachMin: getStomachTime(s),
          icon: getDishIcon(ing.name),
          isCurrent: false,
          recommendedGrams: getRecommendedGrams(ing.name, ingAsDish.calories),
        });
      });
    } else {
      // Fallback: treat previous meals + current dish as items
      todayMeals.forEach(m => {
        const s = calcDigestScore({
          name: m.food_name, calories: m.calories,
          protein_g: m.protein_g, fat_g: m.fat_g, carbs_g: m.carbs_g,
        });
        allDishes.push({
          name: m.food_name, score: s, difficulty: getDifficulty(s),
          stomachMin: getStomachTime(s), icon: getDishIcon(m.food_name), isCurrent: false,
          recommendedGrams: getRecommendedGrams(m.food_name, m.calories),
        });
      });

      allDishes.push({
        name: dish.name, score: digestScore, difficulty, stomachMin,
        icon: getDishIcon(dish.name), isCurrent: true,
        recommendedGrams: getRecommendedGrams(dish.name, dish.calories),
      });
    }

    return allDishes.sort((a, b) => b.score - a.score);
  }, [ingredients, todayMeals, dish, digestScore, difficulty, stomachMin]);

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

        {/* ─── Digestive Tract Animation ─── */}
        <DigestiveTract dishes={orderedDishes} entered={entered} />

        {/* ─── Dish Order Legend ─── */}
        {orderedDishes.length > 1 && (
          <div className="mt-3">
            <p className="text-[9px] font-semibold text-muted-foreground mb-2">🍽 {t.digestOrderTitle}</p>
            <div className="space-y-1">
              {orderedDishes.map((d, i) => {
                const c = COLORS[d.difficulty];
                return (
                  <div key={`legend-${d.name}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
                    style={{
                      background: d.isCurrent ? c.bg : "transparent",
                      ...(d.isCurrent ? { outline: `1px solid ${c.main}33` } : {}),
                    }}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                      style={{ background: c.bg, color: c.main, border: `1px solid ${c.main}33` }}>
                      {i + 1}
                    </span>
                    <span className="text-sm shrink-0">{d.icon}</span>
                    <span className={`text-[10px] truncate flex-1 min-w-0 ${d.isCurrent ? "font-bold text-card-foreground" : "text-muted-foreground"}`}>
                      {d.name}
                      {d.isCurrent && <span className="text-[7px] ml-1 opacity-50">← {t.digestCurrentDish}</span>}
                    </span>
                    {/* Traffic light */}
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.main, opacity: 0.7 }} />
                    <span className="text-[8px] font-mono shrink-0" style={{ color: c.main }}>
                      {d.stomachMin}{t.digestMinUnit}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[8px] text-muted-foreground/50 mt-2 leading-relaxed">
              💡 {t.digestOrderAdvice}
            </p>
          </div>
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
