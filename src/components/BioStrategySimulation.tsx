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
                    {/* Recommended serving */}
                    {d.recommendedGrams && (
                      <span className="text-[8px] font-mono text-muted-foreground/70 shrink-0 px-1.5 py-0.5 rounded-md bg-secondary/50">
                        ≈{d.recommendedGrams}g
                      </span>
                    )}
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
