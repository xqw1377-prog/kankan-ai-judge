import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface Ingredient {
  name: string;
  grams: number;
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
}

type Lane = "fast" | "medium" | "slow";

interface RaceItem {
  name: string;
  lane: Lane;
  speed: number; // 0-1 normalized
  icon: string;
  position: number; // animated 0-1
  order: number; // recommended eating order
}

// Classify digestion speed based on macros
function classifyDigestion(ing: Ingredient): { lane: Lane; speed: number } {
  const total = ing.protein + ing.fat + ing.carbs || 1;
  const carbRatio = ing.carbs / total;
  const fatRatio = ing.fat / total;
  const proteinRatio = ing.protein / total;

  // Simple sugars/refined carbs → fast digestion
  if (carbRatio > 0.6 && fatRatio < 0.2) return { lane: "fast", speed: 0.8 + Math.random() * 0.2 };
  // High fat/protein → slow digestion
  if (fatRatio > 0.4 || proteinRatio > 0.5) return { lane: "slow", speed: 0.2 + Math.random() * 0.3 };
  // Mixed → medium
  return { lane: "medium", speed: 0.4 + Math.random() * 0.3 };
}

function getIngredientIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/米|饭|面|粉|麦|bread|rice|noodle|pasta/.test(lower)) return "🍚";
  if (/鸡|鸭|鹅|chicken|duck|poultry/.test(lower)) return "🍗";
  if (/猪|牛|羊|肉|meat|pork|beef|lamb/.test(lower)) return "🥩";
  if (/鱼|虾|蟹|fish|shrimp|seafood/.test(lower)) return "🐟";
  if (/蛋|egg/.test(lower)) return "🥚";
  if (/菜|蔬|叶|菠|芹|broccoli|spinach|lettuce|vegetable|greens/.test(lower)) return "🥬";
  if (/豆|bean|tofu|soy/.test(lower)) return "🫘";
  if (/果|apple|banana|fruit|berry/.test(lower)) return "🍎";
  if (/奶|牛奶|milk|dairy|cheese/.test(lower)) return "🥛";
  if (/油|butter|oil/.test(lower)) return "🫒";
  if (/糖|sugar|sweet|candy/.test(lower)) return "🍬";
  return "🍽";
}

// Optimal eating order: vegetables → protein → carbs
function getOptimalOrder(items: RaceItem[]): RaceItem[] {
  return [...items].sort((a, b) => {
    const laneOrder: Record<Lane, number> = { slow: 0, medium: 1, fast: 2 };
    return laneOrder[a.lane] - laneOrder[b.lane];
  }).map((item, i) => ({ ...item, order: i + 1 }));
}

interface Props {
  ingredients: Ingredient[];
  visible: boolean;
}

export default function DigestRaceTrack({ ingredients, visible }: Props) {
  const { t } = useI18n();
  const [animPhase, setAnimPhase] = useState(0);
  const [positions, setPositions] = useState<number[]>([]);

  const raceItems = useMemo(() => {
    const items: RaceItem[] = ingredients.map((ing) => {
      const { lane, speed } = classifyDigestion(ing);
      return {
        name: ing.name,
        lane,
        speed,
        icon: getIngredientIcon(ing.name),
        position: 0,
        order: 0,
      };
    });
    return getOptimalOrder(items);
  }, [ingredients]);

  // Animate items entering lanes
  useEffect(() => {
    if (!visible || raceItems.length === 0) return;
    setPositions(new Array(raceItems.length).fill(0));
    
    const timers: number[] = [];
    raceItems.forEach((item, i) => {
      const delay = 300 + i * 200;
      const timer = window.setTimeout(() => {
        setPositions(prev => {
          const next = [...prev];
          next[i] = 0.15 + item.speed * 0.7;
          return next;
        });
      }, delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [visible, raceItems]);

  // Breathing animation
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    const animate = (ts: number) => {
      setAnimPhase((ts % 4000) / 4000);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible || ingredients.length === 0) return null;

  const lanes: { key: Lane; label: string; color: string; bgColor: string }[] = [
    { key: "fast", label: t.digestLaneFast, color: "hsl(0, 72%, 55%)", bgColor: "hsl(0, 72%, 55%, 0.08)" },
    { key: "medium", label: t.digestLaneMedium, color: "hsl(43, 72%, 52%)", bgColor: "hsl(43, 72%, 52%, 0.08)" },
    { key: "slow", label: t.digestLaneSlow, color: "hsl(160, 60%, 45%)", bgColor: "hsl(160, 60%, 45%, 0.08)" },
  ];

  const breathe = 0.9 + 0.1 * Math.sin(animPhase * Math.PI * 2);

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.digestEngineTitle} <span className="flex-1 h-px bg-border" />
      </h3>
      <div className="glass rounded-2xl p-4 shadow-card relative overflow-hidden">
        {/* Race Track */}
        <div className="space-y-2 mb-4">
          {lanes.map((lane) => {
            const laneItems = raceItems
              .map((item, idx) => ({ ...item, idx }))
              .filter(item => item.lane === lane.key);
            
            return (
              <div key={lane.key} className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono font-bold tracking-wider uppercase" style={{ color: lane.color, opacity: 0.7 }}>
                    {lane.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: lane.color, opacity: 0.15 }} />
                </div>
                <div
                  className="relative h-10 rounded-lg overflow-hidden"
                  style={{ background: lane.bgColor }}
                >
                  {/* Track lines */}
                  <div className="absolute inset-0 flex items-center">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-full border-r"
                        style={{
                          width: "5%",
                          borderColor: lane.color,
                          opacity: 0.06,
                        }}
                      />
                    ))}
                  </div>
                  {/* Finish line */}
                  <div
                    className="absolute right-4 top-0 bottom-0 w-px"
                    style={{
                      background: `repeating-linear-gradient(to bottom, ${lane.color} 0px, ${lane.color} 3px, transparent 3px, transparent 6px)`,
                      opacity: 0.3,
                    }}
                  />
                  {/* Items */}
                  {laneItems.map((item) => (
                    <div
                      key={item.idx}
                      className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-[1200ms] ease-out"
                      style={{
                        left: `${(positions[item.idx] || 0) * 85}%`,
                        opacity: positions[item.idx] > 0 ? 1 : 0,
                        transform: `translateY(-50%) scale(${breathe})`,
                      }}
                    >
                      <span className="text-lg drop-shadow-sm">{item.icon}</span>
                      <span
                        className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background: `${lane.color}20`,
                          color: lane.color,
                          boxShadow: `0 0 8px ${lane.color}30`,
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                  ))}
                  {laneItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-mono text-muted-foreground/30">—</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Digest tip */}
        <div className="glass rounded-xl p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            💡 {t.digestRouteTip}
          </p>
        </div>
      </div>
    </section>
  );
}

export { getOptimalOrder, classifyDigestion, type Lane, type RaceItem };
