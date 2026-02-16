import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  gi_value?: number;
  fiber_g?: number;
}

type BpiState = "surplus" | "deficit" | "neutral";

function computeBPI(protein: number, fiber: number, gl: number, fat: number): number {
  return Math.round(50 + (protein * 0.6) + (fiber * 1.2) - (gl * 0.4) - (fat * 0.15));
}

export default function BpiGauge({ calories, protein_g, fat_g, carbs_g, gi_value, fiber_g }: Props) {
  const { t } = useI18n();

  const estimatedFiber = fiber_g ?? Math.round(carbs_g * 0.08);
  const estimatedGL = gi_value ?? Math.round(carbs_g * 0.55);

  const bpi = useMemo(
    () => computeBPI(protein_g, estimatedFiber, estimatedGL, fat_g),
    [protein_g, estimatedFiber, estimatedGL, fat_g]
  );

  const state: BpiState = bpi >= 65 ? "surplus" : bpi <= 40 ? "deficit" : "neutral";

  // Animated water level
  const targetLevel = Math.max(8, Math.min(92, bpi));
  const [animLevel, setAnimLevel] = useState(10);
  useEffect(() => {
    const timer = setTimeout(() => setAnimLevel(targetLevel), 300);
    return () => clearTimeout(timer);
  }, [targetLevel]);

  const nowHour = new Date().getHours();
  const crashTime = `${Math.min(nowHour + 3, 23)}:00`;
  const surplusHours = state === "surplus" ? ((bpi - 50) / 15).toFixed(1) : "0";
  const deficitPct = state === "deficit" ? Math.min(60, Math.round((50 - bpi) * 1.5)) : 0;

  const stateConfig = {
    surplus: {
      color: "hsl(160, 70%, 45%)",
      bgGlow: "hsl(160, 70%, 45%, 0.06)",
      borderColor: "hsl(160, 70%, 45%, 0.25)",
      waveColor1: "hsl(160, 70%, 45%, 0.25)",
      waveColor2: "hsl(160, 70%, 50%, 0.15)",
      icon: TrendingUp,
      label: t.bpiSurplus,
      desc: t.bpiSurplusDesc(surplusHours),
    },
    deficit: {
      color: "hsl(0, 72%, 55%)",
      bgGlow: "hsl(0, 72%, 55%, 0.06)",
      borderColor: "hsl(0, 72%, 55%, 0.25)",
      waveColor1: "hsl(0, 72%, 55%, 0.3)",
      waveColor2: "hsl(0, 65%, 50%, 0.15)",
      icon: TrendingDown,
      label: t.bpiDeficit,
      desc: t.bpiDeficitDesc(crashTime, deficitPct),
    },
    neutral: {
      color: "hsl(43, 80%, 52%)",
      bgGlow: "hsl(43, 80%, 52%, 0.06)",
      borderColor: "hsl(43, 80%, 52%, 0.2)",
      waveColor1: "hsl(43, 80%, 52%, 0.2)",
      waveColor2: "hsl(43, 70%, 55%, 0.1)",
      icon: Minus,
      label: t.bpiNeutral,
      desc: t.bpiNeutralDesc,
    },
  };

  const cfg = stateConfig[state];
  const Icon = cfg.icon;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.06s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.bpiTitle} <span className="flex-1 h-px bg-border" />
      </h3>
      <div
        className="rounded-2xl relative overflow-hidden border transition-all duration-700"
        style={{ borderColor: cfg.borderColor, background: cfg.bgGlow }}
      >
        {/* Pulsing glow for deficit */}
        {state === "deficit" && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ background: `radial-gradient(ellipse at center bottom, hsl(0 72% 55% / 0.1) 0%, transparent 70%)` }}
          />
        )}

        <div className="p-4 flex gap-4">
          {/* Water Level Gauge */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div
              className="relative w-14 h-28 rounded-xl border overflow-hidden"
              style={{ borderColor: cfg.borderColor, background: "hsl(var(--background))" }}
            >
              {/* Water fill */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-[1.5s] ease-out"
                style={{ height: `${animLevel}%` }}
              >
                {/* Wave SVG */}
                <svg className="absolute top-0 left-0 w-full" viewBox="0 0 56 8" preserveAspectRatio="none" style={{ transform: "translateY(-6px)" }}>
                  <path
                    d="M0 4 Q7 0 14 4 Q21 8 28 4 Q35 0 42 4 Q49 8 56 4 L56 8 L0 8 Z"
                    fill={cfg.waveColor1}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0;-14,0;0,0"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
                {/* Fill body */}
                <div
                  className="absolute inset-0 top-2"
                  style={{ background: cfg.waveColor1 }}
                />
                {/* Second wave layer */}
                <svg className="absolute top-0 left-0 w-full" viewBox="0 0 56 8" preserveAspectRatio="none" style={{ transform: "translateY(-3px)" }}>
                  <path
                    d="M0 4 Q7 8 14 4 Q21 0 28 4 Q35 8 42 4 Q49 0 56 4 L56 8 L0 8 Z"
                    fill={cfg.waveColor2}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0;14,0;0,0"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </div>
              {/* Scale marks */}
              {[25, 50, 75].map(mark => (
                <div
                  key={mark}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ bottom: `${mark}%` }}
                >
                  <div className="w-1.5 h-px" style={{ background: cfg.borderColor }} />
                  <span className="text-[5px] font-mono ml-0.5" style={{ color: cfg.color, opacity: 0.4 }}>{mark}</span>
                </div>
              ))}
              {/* BPI value overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-lg font-mono font-black"
                  style={{ color: cfg.color, textShadow: `0 0 12px ${cfg.waveColor1}` }}
                >
                  {bpi}
                </span>
              </div>
            </div>
            <span className="text-[7px] font-mono tracking-wider" style={{ color: cfg.color, opacity: 0.6 }}>
              {t.bpiWaterLevel}
            </span>
          </div>

          {/* Status & Description */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* State badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                  state === "deficit" ? "animate-pulse" : ""
                }`}
                style={{ background: cfg.bgGlow, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </div>
              <div
                className={`w-2 h-2 rounded-full ${state === "deficit" ? "animate-pulse" : ""}`}
                style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.waveColor1}` }}
              />
            </div>

            {/* Description */}
            <p
              className={`text-xs leading-relaxed font-mono font-bold ${
                state === "deficit" ? "animate-pulse" : ""
              }`}
              style={{ color: cfg.color }}
            >
              {state === "surplus" ? "📈" : state === "deficit" ? "🧠💥" : "➖"} {cfg.desc}
            </p>

            {/* Mini breakdown */}
            <div className="flex items-center gap-3 mt-3">
              {[
                { label: "P", val: protein_g, suffix: "g" },
                { label: "F", val: estimatedFiber, suffix: "g" },
                { label: "GL", val: estimatedGL, suffix: "" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className="text-[7px] font-mono text-muted-foreground/40">{item.label}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: cfg.color }}>
                    {item.val}{item.suffix}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-2 border-t flex items-center gap-2" style={{ borderColor: cfg.borderColor }}>
          <Activity className="w-3 h-3" style={{ color: cfg.color, opacity: 0.4 }} />
          <span className="text-[7px] font-mono tracking-wider" style={{ color: cfg.color, opacity: 0.4 }}>
            {t.bpiPerformanceIndex} = 50 + (P×0.6) + (Fiber×1.2) − (GL×0.4) − (Fat×0.15)
          </span>
        </div>
      </div>
    </section>
  );
}
