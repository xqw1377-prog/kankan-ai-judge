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

type EatingOrder = "optimal" | "suboptimal" | "poor";

function evaluateEatingOrder(ingredients: Ingredient[]): EatingOrder {
  if (ingredients.length <= 1) return "optimal";
  // Check if vegetables come first, then protein, then carbs
  const total = ingredients.length;
  let vegFirst = 0;
  let carbLast = 0;
  
  ingredients.forEach((ing, i) => {
    const lower = ing.name.toLowerCase();
    const isVeg = /菜|蔬|叶|菠|芹|broccoli|spinach|lettuce|vegetable|greens|salad/.test(lower);
    const isCarb = /米|饭|面|粉|麦|bread|rice|noodle|pasta|糖|sugar/.test(lower);
    const pos = i / total;
    if (isVeg && pos < 0.4) vegFirst++;
    if (isCarb && pos > 0.5) carbLast++;
  });
  
  if (vegFirst > 0 && carbLast > 0) return "optimal";
  if (vegFirst > 0 || carbLast > 0) return "suboptimal";
  return "poor";
}

// Generate energy curve points (0-4 hours post-meal)
function generateEnergyCurve(order: EatingOrder): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24; // 0-1 representing 0-4 hours
    if (order === "optimal") {
      // Smooth sustained energy
      pts.push(70 + 25 * Math.sin(t * Math.PI * 0.8) * (1 - t * 0.3));
    } else if (order === "suboptimal") {
      // Moderate spike then dip
      const spike = Math.exp(-((t - 0.3) ** 2) / 0.03) * 30;
      const dip = t > 0.5 ? -15 * (t - 0.5) : 0;
      pts.push(65 + spike + dip);
    } else {
      // Sharp spike then crash (fatigue)
      const spike = Math.exp(-((t - 0.2) ** 2) / 0.02) * 40;
      const crash = t > 0.4 ? -30 * (t - 0.4) : 0;
      pts.push(60 + spike + crash);
    }
  }
  return pts;
}

interface Props {
  ingredients: Ingredient[];
}

export default function EnergyPrediction({ ingredients }: Props) {
  const { t } = useI18n();
  const [animProgress, setAnimProgress] = useState(0);

  const order = useMemo(() => evaluateEatingOrder(ingredients), [ingredients]);
  const curve = useMemo(() => generateEnergyCurve(order), [order]);
  const minE = Math.min(...curve) - 5;
  const maxE = Math.max(...curve) + 5;

  useEffect(() => {
    setAnimProgress(0);
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 1200);
      setAnimProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [order]);

  if (ingredients.length === 0) return null;

  const isOptimal = order === "optimal";
  const isPoor = order === "poor";

  const statusColor = isOptimal ? "hsl(160, 60%, 45%)" : isPoor ? "hsl(0, 72%, 55%)" : "hsl(43, 72%, 52%)";
  const statusBg = isOptimal ? "hsl(160, 60%, 45%, 0.08)" : isPoor ? "hsl(0, 72%, 55%, 0.08)" : "hsl(43, 72%, 52%, 0.08)";

  // SVG curve
  const w = 240, h = 60, pad = 4;
  const drawCount = Math.ceil(animProgress * curve.length);
  const pts = curve.slice(0, drawCount).map((v, i) => ({
    x: pad + (i / (curve.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - minE) / (maxE - minE)) * (h - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = pts.length > 1
    ? `${line} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`
    : "";

  // Fatigue zone marker for poor order
  const fatigueStartX = pad + 0.4 * (w - pad * 2);

  return (
    <div className="mt-3 rounded-xl p-3 border border-border/30" style={{ background: statusBg }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-muted-foreground">
          {t.energyPredictionTitle}
        </span>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold"
          style={{
            background: `${statusColor}20`,
            color: statusColor,
          }}
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

      {/* Energy curve */}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 60 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="energy-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fatigue zone for poor order */}
        {isPoor && (
          <rect
            x={fatigueStartX}
            y={pad}
            width={w - pad - fatigueStartX}
            height={h - pad * 2}
            fill="hsl(0, 72%, 55%)"
            opacity="0.06"
            rx="2"
          />
        )}
        {area && <path d={area} fill="url(#energy-fill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={statusColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Time labels */}
        {[0, 1, 2, 3, 4].map((hr) => {
          const x = pad + (hr / 4) * (w - pad * 2);
          return (
            <text
              key={hr}
              x={x}
              y={h - 1}
              fill="currentColor"
              className="text-muted-foreground/30"
              fontSize="6"
              fontFamily="'Space Grotesk', monospace"
              textAnchor="middle"
            >
              {hr}h
            </text>
          );
        })}
      </svg>

      {/* Tip */}
      <p className="text-[9px] mt-2 leading-relaxed" style={{ color: statusColor }}>
        {isOptimal ? t.energyOptimalTip : isPoor ? t.energyFatigueTip : t.energyModerateTip}
      </p>
    </div>
  );
}
