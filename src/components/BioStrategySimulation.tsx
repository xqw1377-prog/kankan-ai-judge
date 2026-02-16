import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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

interface SimBall {
  id: number;
  name: string;
  type: BallType;
  icon: string;
  calories: number;
}

const BALL_COLORS: Record<BallType, { color: string; glow: string; bg: string }> = {
  pioneer: { color: "hsl(160, 70%, 45%)", glow: "rgba(57,200,100,0.35)", bg: "rgba(57,200,100,0.12)" },
  supply:  { color: "hsl(43, 80%, 52%)",  glow: "rgba(212,175,55,0.35)", bg: "rgba(212,175,55,0.12)" },
  core:    { color: "hsl(0, 72%, 55%)",   glow: "rgba(255,50,50,0.35)",  bg: "rgba(255,50,50,0.12)" },
};

function classifyBall(name: string, ing: Ingredient): BallType {
  const l = name.toLowerCase();
  if (/菜|蔬|叶|菠|芹|笋|瓜|萝卜|broccoli|spinach|lettuce|vegetable|greens|salad|celery|cucumber/.test(l)) return "pioneer";
  if (/鸡|鸭|鹅|猪|牛|羊|肉|鱼|虾|蟹|蛋|豆腐|chicken|duck|pork|beef|lamb|meat|fish|shrimp|egg|tofu|protein/.test(l)) return "supply";
  if (/米|饭|面|粉|麦|馒头|包子|bread|rice|noodle|pasta|糖|sugar|薯|芋/.test(l)) return "core";
  const total = ing.protein + ing.fat + ing.carbs || 1;
  if (ing.carbs / total > 0.6) return "core";
  if (ing.protein / total > 0.4) return "supply";
  return "pioneer";
}

function getBallIcon(name: string): string {
  const l = name.toLowerCase();
  if (/米|饭|rice/.test(l)) return "🍚";
  if (/面|粉|noodle|pasta/.test(l)) return "🍜";
  if (/鸡|chicken/.test(l)) return "🍗";
  if (/猪|牛|羊|肉|meat|pork|beef/.test(l)) return "🥩";
  if (/鱼|虾|fish|shrimp/.test(l)) return "🐟";
  if (/蛋|egg/.test(l)) return "🥚";
  if (/菜|蔬|叶|vegetable|greens/.test(l)) return "🥬";
  if (/豆|bean|tofu/.test(l)) return "🫘";
  if (/bread|馒头|包/.test(l)) return "🍞";
  return "🍽";
}

type SequenceQuality = "optimal" | "moderate" | "poor";

function evaluateSequence(balls: SimBall[]): SequenceQuality {
  if (balls.length <= 1) return "optimal";
  const types = balls.map(b => b.type);
  const firstCore = types.indexOf("core");
  const firstPioneer = types.indexOf("pioneer");
  const lastPioneer = types.lastIndexOf("pioneer");

  // If core comes before all pioneers → poor
  if (firstCore !== -1 && firstPioneer !== -1 && firstCore < firstPioneer) return "poor";
  // If core is in first half → poor
  if (firstCore !== -1 && firstCore < balls.length * 0.3) return "poor";
  // If pioneer is in first position → check if overall OK
  if (firstPioneer === 0) return "optimal";
  // Mixed
  return "moderate";
}

function generateFocusCurve(quality: SequenceQuality, topType?: BallType): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    if (quality === "poor" || topType === "core") {
      // Dramatic: huge spike then deep crash
      const spike = Math.exp(-((t - 0.15) ** 2) / 0.012) * 55;
      const crash = t > 0.25 ? -50 * (t - 0.25) : 0;
      const floor = t > 0.5 ? -5 * Math.sin((t - 0.5) * Math.PI * 3) : 0;
      pts.push(Math.max(15, 50 + spike + crash + floor));
    } else if (quality === "optimal" && topType === "pioneer") {
      // Smooth high plateau
      pts.push(80 + 15 * Math.sin(t * Math.PI * 0.7) * (1 - t * 0.15));
    } else if (quality === "optimal") {
      pts.push(75 + 20 * Math.sin(t * Math.PI * 0.8) * (1 - t * 0.2));
    } else {
      const spike = Math.exp(-((t - 0.3) ** 2) / 0.04) * 25;
      const dip = t > 0.5 ? -12 * (t - 0.5) : 0;
      pts.push(65 + spike + dip);
    }
  }
  return pts;
}

function getTacticalAdvice(quality: SequenceQuality, balls: SimBall[], t: any): string {
  const pioneerCount = balls.filter(b => b.type === "pioneer").length;
  const coreCount = balls.filter(b => b.type === "core").length;

  if (quality === "optimal") {
    if (pioneerCount > 0) {
      return t.tacticOptimalWithFiber(pioneerCount);
    }
    return t.tacticOptimalGeneral;
  }
  if (quality === "poor") {
    return t.tacticPoor;
  }
  return t.tacticModerate;
}

interface Props {
  ingredients: Ingredient[];
  visible: boolean;
  onSequenceQualityChange?: (quality: SequenceQuality) => void;
}

export type { SequenceQuality };

export default function BioStrategySimulation({ ingredients, visible, onSequenceQualityChange }: Props) {
  const { t } = useI18n();

  // Initialize balls sorted by optimal order: pioneer → supply → core
  const initialBalls = useMemo((): SimBall[] => {
    return ingredients
      .map((ing, i) => ({
        id: i,
        name: ing.name,
        type: classifyBall(ing.name, ing),
        icon: getBallIcon(ing.name),
        calories: ing.calories,
      }))
      .sort((a, b) => {
        const order: Record<BallType, number> = { pioneer: 0, supply: 1, core: 2 };
        return order[a.type] - order[b.type];
      });
  }, [ingredients]);

  const [balls, setBalls] = useState<SimBall[]>(initialBalls);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const touchStartY = useRef(0);
  const touchStartIdx = useRef<number | null>(null);

  // Sync when ingredients change
  useEffect(() => { setBalls(initialBalls); }, [initialBalls]);

  // Entry animation
  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const timer = setTimeout(() => setEntered(true), 200);
    return () => clearTimeout(timer);
  }, [visible]);

  // Evaluate current sequence
  const quality = useMemo(() => evaluateSequence(balls), [balls]);
  const topType = balls.length > 0 ? balls[0].type : undefined;
  const isPioneerTop = topType === "pioneer";
  const isCoreTop = topType === "core";
  const curve = useMemo(() => generateFocusCurve(quality, topType), [quality, topType]);
  const advice = useMemo(() => getTacticalAdvice(quality, balls, t), [quality, balls, t]);

  // Notify parent of sequence quality changes
  useEffect(() => {
    onSequenceQualityChange?.(quality);
  }, [quality, onSequenceQualityChange]);

  // Animate curve on quality change
  useEffect(() => {
    setAnimProgress(0);
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 900);
      setAnimProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [quality]);

  // Drag handlers (touch)
  const handleTouchStart = useCallback((idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartIdx.current = idx;
    setDragIdx(idx);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartIdx.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    const threshold = 40;
    if (Math.abs(deltaY) > threshold) {
      const dir = deltaY > 0 ? 1 : -1;
      const fromIdx = touchStartIdx.current;
      const toIdx = fromIdx + dir;
      if (toIdx >= 0 && toIdx < balls.length) {
        setBalls(prev => {
          const next = [...prev];
          [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
          return next;
        });
        touchStartIdx.current = toIdx;
        touchStartY.current = e.touches[0].clientY;
      }
    }
  }, [balls.length]);

  const handleTouchEnd = useCallback(() => {
    setDragIdx(null);
    touchStartIdx.current = null;
  }, []);

  // Drag handlers (mouse)
  const handleMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    touchStartY.current = e.clientY;
    touchStartIdx.current = idx;
    setDragIdx(idx);

    const handleMouseMove = (ev: MouseEvent) => {
      if (touchStartIdx.current === null) return;
      const deltaY = ev.clientY - touchStartY.current;
      const threshold = 35;
      if (Math.abs(deltaY) > threshold) {
        const dir = deltaY > 0 ? 1 : -1;
        const fromIdx = touchStartIdx.current;
        const toIdx = fromIdx + dir;
        setBalls(prev => {
          if (toIdx < 0 || toIdx >= prev.length) return prev;
          const next = [...prev];
          [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
          touchStartIdx.current = toIdx;
          touchStartY.current = ev.clientY;
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      setDragIdx(null);
      touchStartIdx.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  if (!visible || ingredients.length === 0) return null;

  const isPoor = quality === "poor" || isCoreTop;
  const isOptimal = quality === "optimal";

  const statusColor = isCoreTop ? "hsl(0, 72%, 55%)" : isOptimal ? "hsl(160, 60%, 45%)" : isPoor ? "hsl(0, 72%, 55%)" : "hsl(43, 72%, 52%)";

  // Focus curve SVG
  const cW = 130, cH = 80, cPad = 6;
  const drawCount = Math.ceil(animProgress * curve.length);
  const minE = Math.min(...curve) - 5;
  const maxE = Math.max(...curve) + 5;
  const curvePts = curve.slice(0, drawCount).map((v, i) => ({
    x: cPad + (i / (curve.length - 1)) * (cW - cPad * 2),
    y: cPad + (1 - (v - minE) / (maxE - minE)) * (cH - cPad * 2),
  }));
  const curveLine = curvePts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const curveArea = curvePts.length > 1
    ? `${curveLine} L ${curvePts[curvePts.length - 1].x} ${cH - cPad} L ${curvePts[0].x} ${cH - cPad} Z`
    : "";
  const fatigueX = cPad + 0.35 * (cW - cPad * 2);

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.bioStrategyTitle} <span className="flex-1 h-px bg-border" />
      </h3>
      <div
        className={`glass rounded-2xl p-4 shadow-card relative overflow-hidden transition-all duration-500 ${
          isPoor ? "ring-1 ring-destructive/30" : ""
        }`}
      >
        {/* Red overlay when poor */}
        {isPoor && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl animate-pulse"
            style={{ background: "radial-gradient(ellipse at center, hsl(0 72% 55% / 0.06) 0%, transparent 70%)" }}
          />
        )}

        {/* Main layout: Funnel (left) + Focus Curve (right) */}
        <div className="flex gap-3">
          {/* LEFT: Vertical Funnel */}
          <div className="flex-1 min-w-0">
            {/* Top label */}
            <div className="text-center mb-2">
              <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase">
                ▼ {t.funnelIntake}
              </span>
            </div>

            {/* Funnel container */}
            <div className="relative mx-auto" style={{ maxWidth: 180 }}>
              {/* SVG Funnel shape (background) */}
              <svg viewBox="0 0 180 260" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                {/* Funnel body */}
                <path
                  d="M 10 5 L 170 5 L 130 180 L 115 250 L 65 250 L 50 180 Z"
                  fill="none"
                  stroke={isPoor ? "hsl(0, 72%, 55%)" : "hsl(var(--border))"}
                  strokeWidth="1.2"
                  opacity={isPoor ? 0.4 : 0.15}
                  className="transition-all duration-500"
                />
                <path
                  d="M 12 7 L 168 7 L 129 179 L 114 248 L 66 248 L 51 179 Z"
                  fill={isPoor ? "hsl(0, 72%, 55%, 0.03)" : "hsl(var(--primary) / 0.02)"}
                />
                {/* Grid lines */}
                {[50, 100, 150, 200].map(y => {
                  const ratio = (y - 5) / 245;
                  const halfW = 80 - ratio * 47;
                  return (
                    <line key={y} x1={90 - halfW} y1={y} x2={90 + halfW} y2={y}
                      stroke="hsl(var(--border))" strokeWidth="0.4" opacity="0.08"
                    />
                  );
                })}
                {/* Exit spout */}
                <rect x="75" y="250" width="30" height="6" rx="2"
                  fill={isPoor ? "hsl(0, 72%, 55%, 0.15)" : isPioneerTop ? "hsl(160, 70%, 45%, 0.2)" : "hsl(var(--primary) / 0.08)"}
                  stroke={isPoor ? "hsl(0, 72%, 55%)" : isPioneerTop ? "hsl(160, 70%, 45%)" : "hsl(var(--border))"}
                  strokeWidth="0.6" opacity={isPioneerTop ? 0.7 : 0.4}
                />
                {/* Buffer filter glow when pioneer is on top */}
                {isPioneerTop && (
                  <>
                    <rect x="65" y="244" width="50" height="4" rx="2"
                      fill="hsl(160, 70%, 45%)" opacity="0.15"
                    >
                      <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
                    </rect>
                    <line x1="70" y1="246" x2="110" y2="246"
                      stroke="hsl(160, 70%, 45%)" strokeWidth="1" strokeDasharray="3 2" opacity="0.4"
                    >
                      <animate attributeName="strokeDashoffset" values="0;-10" dur="1.5s" repeatCount="indefinite" />
                    </line>
                  </>
                )}
              </svg>

              {/* Ball slots (draggable) */}
              <div
                className="relative flex flex-col items-center gap-1 py-3 px-2"
                style={{ minHeight: Math.max(180, balls.length * 52 + 40) }}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {balls.map((ball, i) => {
                  const cfg = BALL_COLORS[ball.type];
                  const isDragging = dragIdx === i;
                  const typeLabel = ball.type === "pioneer" ? t.funnelPioneer
                    : ball.type === "supply" ? t.funnelSupply : t.funnelCore;

                  return (
                    <div
                      key={ball.id}
                      className={`relative flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-grab select-none transition-all duration-300 ${
                        isDragging ? "scale-105 z-20 shadow-lg" : "z-10"
                      }`}
                      style={{
                        background: isDragging ? `${cfg.bg}` : "transparent",
                        opacity: entered ? 1 : 0,
                        transform: `translateY(${entered ? 0 : -20}px) ${isDragging ? "scale(1.05)" : "scale(1)"}`,
                        transitionDelay: `${i * 100}ms`,
                      }}
                      onTouchStart={(e) => handleTouchStart(i, e)}
                      onMouseDown={(e) => handleMouseDown(i, e)}
                    >
                      {/* Order number */}
                      <span className="text-[8px] font-mono text-muted-foreground/30 w-3 text-center shrink-0">
                        {i + 1}
                      </span>
                      {/* Ball */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-shadow"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}88)`,
                          boxShadow: isDragging
                            ? `0 4px 20px ${cfg.glow}, inset 0 1px 3px rgba(255,255,255,0.3)`
                            : `0 2px 8px ${cfg.glow}, inset 0 1px 2px rgba(255,255,255,0.2)`,
                        }}
                      >
                        {ball.icon}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-mono font-bold text-card-foreground truncate leading-tight">
                          {ball.name}
                        </p>
                        <p className="text-[7px] font-mono whitespace-nowrap" style={{ color: cfg.color }}>
                          {typeLabel}
                        </p>
                      </div>
                      {/* Drag handle */}
                      <div className="flex flex-col gap-px shrink-0 opacity-30">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom label + buffer filter status */}
            <div className="text-center mt-1">
              {isPioneerTop ? (
                <span className="text-[8px] font-mono tracking-widest uppercase font-bold" style={{ color: "hsl(160, 70%, 45%)" }}>
                  🛡 {t.bufferFilterActive}
                </span>
              ) : (
                <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase">
                  ⚡ {t.funnelEnergyOutput}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: Focus Prediction Curve */}
          <div className="w-[140px] shrink-0 flex flex-col">
            <div className="text-[8px] font-mono font-bold tracking-wider uppercase text-muted-foreground mb-1.5 text-center">
              {t.focusPredictionTitle}
            </div>

            {/* Status badge */}
            <div className="flex justify-center mb-2">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-mono font-bold"
                style={{ background: `${statusColor}20`, color: statusColor }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: statusColor,
                    animation: isPoor ? "pulse 1.5s ease-in-out infinite" : undefined,
                  }}
                />
                {isOptimal ? t.energyOptimal : isPoor ? t.energyFatigueWarning : t.energyModerate}
              </div>
            </div>

            {/* SVG Curve */}
            <div className="flex-1 relative">
              <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full h-full" style={{ minHeight: 70 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="focus-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={statusColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Fatigue zone */}
                {isPoor && (
                  <rect x={fatigueX} y={cPad} width={cW - cPad - fatigueX} height={cH - cPad * 2}
                    fill="hsl(0, 72%, 55%)" opacity="0.06" rx="2"
                  />
                )}
                {curveArea && <path d={curveArea} fill="url(#focus-fill)" />}
                {curveLine && (
                  <path d={curveLine} fill="none" stroke={statusColor}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                )}
                {/* Time labels */}
                {[0, 1, 2, 3, 4].map(hr => (
                  <text key={hr} x={cPad + (hr / 4) * (cW - cPad * 2)} y={cH - 1}
                    fill="currentColor" className="text-muted-foreground/25"
                    fontSize="5" fontFamily="monospace" textAnchor="middle"
                  >
                    {hr}h
                  </text>
                ))}
              </svg>
            </div>

            {/* Tip */}
            <p className="text-[8px] mt-1.5 leading-relaxed text-center" style={{ color: statusColor }}>
              {isOptimal ? t.energyOptimalTip : isPoor ? t.energyFatigueTip : t.energyModerateTip}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 mb-2">
          {([
            { type: "pioneer" as BallType, label: t.funnelPioneer },
            { type: "supply" as BallType, label: t.funnelSupply },
            { type: "core" as BallType, label: t.funnelCore },
          ]).map(({ type, label }) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{
                background: BALL_COLORS[type].color,
                boxShadow: `0 0 4px ${BALL_COLORS[type].glow}`,
              }} />
              <span className="text-[7px] font-mono text-muted-foreground/50">{label}</span>
            </div>
          ))}
        </div>

        {/* Tactical advice */}
        <div
          className={`rounded-xl p-3 border transition-all duration-500 ${
            isPoor ? "border-destructive/30 bg-destructive/5" : "border-border/30 glass"
          }`}
        >
          <p className={`text-[10px] leading-relaxed ${
            isPoor ? "text-destructive font-bold" : "text-muted-foreground"
          }`}>
            🎯 {advice}
          </p>
        </div>

        {/* Drag hint */}
        <p className="text-[8px] font-mono text-muted-foreground/30 text-center mt-2">
          ↕ {t.dragToReorder}
        </p>
      </div>
    </section>
  );
}
