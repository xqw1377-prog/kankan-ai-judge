import { useMemo, useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

interface Ingredient {
  name: string;
  grams: number;
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
}

type BallType = "pioneer" | "supply" | "core";

interface FunnelBall {
  name: string;
  type: BallType;
  icon: string;
  label: string;
  weight: number;
  dropDelay: number;
  settled: boolean;
}

function classifyBall(name: string, ing: Ingredient): BallType {
  const lower = name.toLowerCase();
  // Vegetables/fiber → pioneer (blue)
  if (/菜|蔬|叶|菠|芹|笋|瓜|萝卜|broccoli|spinach|lettuce|vegetable|greens|salad|celery|cucumber/.test(lower)) return "pioneer";
  // Protein/meat → supply (yellow)
  if (/鸡|鸭|鹅|猪|牛|羊|肉|鱼|虾|蟹|蛋|豆腐|chicken|duck|pork|beef|lamb|meat|fish|shrimp|egg|tofu|protein/.test(lower)) return "supply";
  // Carbs/staples → core (red)
  if (/米|饭|面|粉|麦|馒头|包子|bread|rice|noodle|pasta|糖|sugar|薯|芋/.test(lower)) return "core";
  // Fallback: classify by macro ratio
  const total = ing.protein + ing.fat + ing.carbs || 1;
  if (ing.carbs / total > 0.6) return "core";
  if (ing.protein / total > 0.4) return "supply";
  return "pioneer";
}

function getBallIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/米|饭|rice/.test(lower)) return "🍚";
  if (/面|粉|noodle|pasta/.test(lower)) return "🍜";
  if (/鸡|chicken/.test(lower)) return "🍗";
  if (/猪|牛|羊|肉|meat|pork|beef/.test(lower)) return "🥩";
  if (/鱼|虾|fish|shrimp/.test(lower)) return "🐟";
  if (/蛋|egg/.test(lower)) return "🥚";
  if (/菜|蔬|叶|vegetable|greens/.test(lower)) return "🥬";
  if (/豆|bean|tofu/.test(lower)) return "🫘";
  if (/果|fruit|apple/.test(lower)) return "🍎";
  if (/奶|milk/.test(lower)) return "🥛";
  if (/bread|馒头|包/.test(lower)) return "🍞";
  return "🍽";
}

const BALL_CONFIG: Record<BallType, { color: string; glow: string; bg: string; order: number }> = {
  pioneer: { color: "hsl(200, 80%, 55%)", glow: "hsl(200, 80%, 55%, 0.4)", bg: "hsl(200, 80%, 55%, 0.12)", order: 0 },
  supply:  { color: "hsl(43, 80%, 52%)",  glow: "hsl(43, 80%, 52%, 0.4)",  bg: "hsl(43, 80%, 52%, 0.12)",  order: 1 },
  core:    { color: "hsl(0, 72%, 55%)",   glow: "hsl(0, 72%, 55%, 0.4)",   bg: "hsl(0, 72%, 55%, 0.12)",   order: 2 },
};

interface Props {
  ingredients: Ingredient[];
  visible: boolean;
}

export default function DigestFunnel({ ingredients, visible }: Props) {
  const { t } = useI18n();
  const [droppedCount, setDroppedCount] = useState(0);
  const [congested, setCongested] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Classify and sort balls
  const balls = useMemo((): FunnelBall[] => {
    const items = ingredients.map((ing, i) => {
      const type = classifyBall(ing.name, ing);
      return {
        name: ing.name,
        type,
        icon: getBallIcon(ing.name),
        label: type === "pioneer" ? t.funnelPioneer : type === "supply" ? t.funnelSupply : t.funnelCore,
        weight: ing.grams,
        dropDelay: 0,
        settled: false,
      };
    });
    // Sort by optimal order: pioneer → supply → core
    items.sort((a, b) => BALL_CONFIG[a.type].order - BALL_CONFIG[b.type].order);
    items.forEach((ball, i) => { ball.dropDelay = i * 400 + 300; });
    return items;
  }, [ingredients, t]);

  // Check if user's original order conflicts with optimal
  const isOrderWrong = useMemo(() => {
    if (ingredients.length <= 1) return false;
    const types = ingredients.map(ing => classifyBall(ing.name, ing));
    // If a "core" appears before any "pioneer", order is wrong
    const firstCore = types.indexOf("core");
    const lastPioneer = types.lastIndexOf("pioneer");
    return firstCore !== -1 && lastPioneer !== -1 && firstCore < lastPioneer;
  }, [ingredients]);

  // Animate balls dropping
  useEffect(() => {
    if (!visible || balls.length === 0) { setDroppedCount(0); return; }
    setDroppedCount(0);
    const timers: number[] = [];
    balls.forEach((_, i) => {
      timers.push(window.setTimeout(() => setDroppedCount(c => c + 1), balls[i].dropDelay));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, balls]);

  // Congestion animation
  useEffect(() => {
    if (!isOrderWrong) { setCongested(false); return; }
    const timer = setTimeout(() => setCongested(true), balls.length * 400 + 800);
    return () => clearTimeout(timer);
  }, [isOrderWrong, balls.length]);

  // Pulse animation
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    const animate = (ts: number) => {
      setPulsePhase((ts % 3000) / 3000);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible || ingredients.length === 0) return null;

  const breathe = 0.95 + 0.05 * Math.sin(pulsePhase * Math.PI * 2);
  // Energy "processed" count
  const processedCalories = balls.slice(0, droppedCount).reduce((s, b) => {
    const ing = ingredients.find(i => i.name === b.name);
    return s + (ing?.calories || 0);
  }, 0);

  // Fun tip based on state
  const tipText = congested
    ? t.funnelCongestionTip
    : isOrderWrong
      ? t.funnelWrongOrderTip
      : droppedCount >= balls.length
        ? t.funnelPerfectTip
        : t.funnelProcessingTip;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.digestEngineTitle} <span className="flex-1 h-px bg-border" />
      </h3>
      <div
        className={`glass rounded-2xl p-4 shadow-card relative overflow-hidden transition-all duration-500 ${
          congested ? "ring-1 ring-destructive/40" : ""
        }`}
        style={{
          transform: congested ? `translateX(${Math.sin(pulsePhase * Math.PI * 8) * 2}px)` : undefined,
        }}
      >
        {/* Congestion red overlay */}
        {congested && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500"
            style={{ background: "radial-gradient(ellipse at center, hsl(0 72% 55% / 0.08) 0%, transparent 70%)" }}
          />
        )}

        {/* Funnel visualization */}
        <div className="relative flex flex-col items-center py-2">
          {/* TOP: Waiting area — unsorted balls */}
          <div className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-2">
            ▼ {t.funnelWaiting}
          </div>

          {/* Funnel body */}
          <div className="relative w-full" style={{ maxWidth: 280 }}>
            {/* Funnel SVG shape */}
            <svg viewBox="0 0 280 200" className="w-full" style={{ height: 200 }}>
              {/* Funnel outline */}
              <path
                d="M 20 10 L 260 10 L 190 130 L 170 190 L 110 190 L 90 130 Z"
                fill="none"
                stroke={congested ? "hsl(0, 72%, 55%)" : "hsl(var(--border))"}
                strokeWidth="1.5"
                opacity={congested ? 0.5 : 0.2}
                className="transition-all duration-500"
              />
              {/* Inner glow fill */}
              <path
                d="M 22 12 L 258 12 L 189 129 L 169 188 L 111 188 L 91 129 Z"
                fill={congested ? "hsl(0, 72%, 55%, 0.04)" : "hsl(var(--primary) / 0.03)"}
                className="transition-all duration-500"
              />
              {/* Grid lines inside funnel */}
              {[40, 70, 100, 130].map(y => {
                const ratio = (y - 10) / 180;
                const halfW = 120 - ratio * 80;
                const cx = 140;
                return (
                  <line
                    key={y}
                    x1={cx - halfW} y1={y} x2={cx + halfW} y2={y}
                    stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.1"
                  />
                );
              })}
              {/* Funnel exit spout */}
              <rect x="125" y="190" width="30" height="8" rx="2"
                fill={congested ? "hsl(0, 72%, 55%, 0.2)" : "hsl(var(--primary) / 0.1)"}
                stroke={congested ? "hsl(0, 72%, 55%)" : "hsl(var(--border))"}
                strokeWidth="0.8" opacity="0.5"
              />
            </svg>

            {/* Balls inside funnel */}
            {balls.map((ball, i) => {
              const isDropped = i < droppedCount;
              const config = BALL_CONFIG[ball.type];
              // Position: dropped balls settle in funnel from bottom to top
              // Calculate vertical position within funnel
              const totalBalls = balls.length;
              const settledRow = totalBalls - 1 - i; // bottom-first
              const ySettled = 150 - settledRow * (120 / Math.max(totalBalls, 1));
              const yWaiting = -20;
              const y = isDropped ? ySettled : yWaiting;
              // Horizontal position: slight spread
              const xBase = 140;
              const spread = Math.max(10, 40 - settledRow * 5);
              const xOffset = (i % 3 - 1) * spread * 0.4;

              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center transition-all ease-out pointer-events-none"
                  style={{
                    left: `calc(50% + ${xOffset}px - 20px)`,
                    top: y,
                    opacity: isDropped ? 1 : 0,
                    transform: `scale(${isDropped ? breathe : 0.5})`,
                    transitionDuration: "800ms",
                    transitionDelay: `${i * 80}ms`,
                    zIndex: 10 + i,
                  }}
                >
                  {/* Ball */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base relative"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${config.color}dd, ${config.color}88)`,
                      boxShadow: `0 2px 12px ${config.glow}, inset 0 1px 2px rgba(255,255,255,0.3)`,
                    }}
                  >
                    {ball.icon}
                  </div>
                  {/* Label */}
                  <div
                    className="mt-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-mono font-bold whitespace-nowrap"
                    style={{
                      background: config.bg,
                      color: config.color,
                      boxShadow: `0 0 6px ${config.glow}`,
                    }}
                  >
                    {ball.label}
                  </div>
                  {/* Name */}
                  <span className="text-[8px] font-mono text-muted-foreground/60 mt-0.5 whitespace-nowrap">
                    {ball.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* BOTTOM: Energy "processed" counter */}
          <div className="flex items-center gap-2 mt-2">
            <div className="text-[8px] font-mono text-muted-foreground/50 tracking-wider uppercase">
              ⚡ {t.funnelEnergyProcessed}
            </div>
            <span className="text-xs font-mono font-bold text-primary">
              {processedCalories} kcal
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 mb-2">
          {([
            { type: "pioneer" as BallType, label: t.funnelPioneer },
            { type: "supply" as BallType, label: t.funnelSupply },
            { type: "core" as BallType, label: t.funnelCore },
          ]).map(({ type, label }) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: BALL_CONFIG[type].color,
                  boxShadow: `0 0 4px ${BALL_CONFIG[type].glow}`,
                }}
              />
              <span className="text-[8px] font-mono text-muted-foreground/50">{label}</span>
            </div>
          ))}
        </div>

        {/* Congestion warning or fun tip */}
        <div
          className={`rounded-xl p-3 border transition-all duration-500 ${
            congested
              ? "border-destructive/30 bg-destructive/5"
              : "border-border/30 glass"
          }`}
        >
          <p className={`text-[10px] leading-relaxed ${
            congested ? "text-destructive font-bold" : "text-muted-foreground"
          }`}>
            {congested ? "⚠️" : "💡"} {tipText}
          </p>
        </div>
      </div>
    </section>
  );
}
