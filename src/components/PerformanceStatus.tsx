import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Droplets, Footprints, Coffee, X, AlertTriangle } from "lucide-react";

interface Props {
  todayTotals: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
  targets: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
}

type PerfState = "surplus" | "deficit" | "neutral";

function computePerf(totals: Props["todayTotals"], targets: Props["targets"]) {
  const calRatio = targets.calories > 0 ? totals.calories / targets.calories : 0;
  const proteinRatio = targets.protein_g > 0 ? totals.protein_g / targets.protein_g : 0;
  const fatRatio = targets.fat_g > 0 ? totals.fat_g / targets.fat_g : 0;
  const score = Math.round(
    50 + (proteinRatio * 30) - (Math.max(0, calRatio - 0.8) * 40) - (Math.max(0, fatRatio - 0.6) * 20)
  );
  return Math.max(5, Math.min(100, score));
}

export default function PerformanceStatus({ todayTotals, targets }: Props) {
  const { t } = useI18n();
  const [showHedge, setShowHedge] = useState(false);
  const [hedgeApplied, setHedgeApplied] = useState<string | null>(null);

  const battery = useMemo(() => computePerf(todayTotals, targets), [todayTotals, targets]);
  const state: PerfState = battery >= 65 ? "surplus" : battery <= 40 ? "deficit" : "neutral";

  // Gauge: 0-100 maps to -50..+50 from center
  // surplus → bar grows right (green), deficit → bar grows left (red)
  const gaugeOffset = battery - 50; // -45..+50
  const [animOffset, setAnimOffset] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimOffset(gaugeOffset), 400);
    return () => clearTimeout(timer);
  }, [gaugeOffset]);

  const nowHour = new Date().getHours();
  const focusHours = state === "surplus" ? ((battery - 50) / 20 * 2.5).toFixed(1) : "0";
  const sustainTime = `${Math.min(nowHour + Math.ceil(parseFloat(focusHours)), 23)}:00`;
  const crashTime = `${Math.min(nowHour + 3, 23)}:00`;
  const perfLoss = state === "deficit" ? Math.min(60, Math.round((50 - battery) * 1.2)) : 0;

  const cfg = {
    surplus: {
      color: "hsl(160, 70%, 45%)",
      bg: "hsl(160, 70%, 45%, 0.06)",
      border: "hsl(160, 70%, 45%, 0.25)",
      fill: "hsl(160, 70%, 45%, 0.5)",
      glow: "hsl(160, 70%, 45%, 0.2)",
    },
    deficit: {
      color: "hsl(0, 72%, 55%)",
      bg: "hsl(0, 72%, 55%, 0.06)",
      border: "hsl(0, 72%, 55%, 0.25)",
      fill: "hsl(0, 72%, 55%, 0.55)",
      glow: "hsl(0, 72%, 55%, 0.2)",
    },
    neutral: {
      color: "hsl(43, 80%, 52%)",
      bg: "hsl(43, 80%, 52%, 0.06)",
      border: "hsl(43, 80%, 52%, 0.2)",
      fill: "hsl(43, 80%, 52%, 0.4)",
      glow: "hsl(43, 80%, 52%, 0.15)",
    },
  }[state];

  const hedgeOptions = [
    { key: "water", icon: Droplets, label: "补充500ml电解质水", effect: "稀释血糖峰值，挽回约15%性能损耗" },
    { key: "walk", icon: Footprints, label: "餐后15分钟快走", effect: "加速葡萄糖利用，挽回约30%损耗" },
    { key: "rest", icon: Coffee, label: "5分钟深呼吸冥想", effect: "降低皮质醇，恢复专注力基线" },
  ];

  // Gauge bar math: center is 50%, bar extends left or right
  const barLeft = animOffset < 0 ? `${50 + animOffset}%` : "50%";
  const barWidth = `${Math.abs(animOffset)}%`;

  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all duration-700 relative"
      style={{ borderColor: cfg.border, background: cfg.bg }}
    >
      {/* Deficit pulsing glow */}
      {state === "deficit" && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse rounded-2xl"
          style={{ background: `radial-gradient(ellipse at 30% 50%, hsl(0 72% 55% / 0.08) 0%, transparent 60%)` }}
        />
      )}

      <div className="p-4 relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground">
            {t.perfStatusTitle}
          </span>
          <div className="flex-1 h-px bg-border/30" />
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider ${
              state === "deficit" ? "animate-pulse" : ""
            }`}
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${state === "deficit" ? "animate-pulse" : ""}`}
              style={{ background: cfg.color }}
            />
            {state === "surplus" ? t.pnlSurplus : state === "deficit" ? t.pnlDeficit : t.pnlNeutral}
          </div>
        </div>

        {/* Center-out Gauge Bar */}
        <div className="mb-3">
          <div className="relative h-5 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
            {/* Scale marks */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              {[-40, -20, 0, 20, 40].map(mark => (
                <div key={mark} className="flex flex-col items-center">
                  <div className="w-px h-2" style={{ background: mark === 0 ? cfg.color : "hsl(var(--muted-foreground) / 0.15)" }} />
                </div>
              ))}
            </div>
            {/* Center line */}
            <div
              className="absolute top-0 bottom-0 w-0.5"
              style={{ left: "50%", transform: "translateX(-50%)", background: "hsl(var(--muted-foreground) / 0.3)" }}
            />
            {/* Animated fill bar from center */}
            <div
              className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-[1.5s] ease-out"
              style={{
                left: barLeft,
                width: barWidth,
                background: cfg.fill,
                boxShadow: `0 0 12px ${cfg.glow}`,
              }}
            />
            {/* Value label on the bar */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-[9px] font-mono font-black tracking-wider"
                style={{ color: cfg.color, textShadow: `0 0 6px ${cfg.glow}` }}
              >
                {animOffset > 0 ? "+" : ""}{Math.round(animOffset)}
              </span>
            </div>
          </div>
          {/* Scale labels */}
          <div className="flex justify-between mt-0.5 px-1">
            <span className="text-[6px] font-mono text-destructive/40">−50</span>
            <span className="text-[6px] font-mono text-muted-foreground/30">0</span>
            <span className="text-[6px] font-mono" style={{ color: "hsl(160, 70%, 45%, 0.4)" }}>+50</span>
          </div>
        </div>

        {/* Status description */}
        <div className={`text-sm font-bold leading-relaxed ${state === "deficit" ? "animate-pulse" : ""}`}
          style={{ color: cfg.color }}>
          {state === "surplus"
            ? `🟢 今日生理性能处于牛市，专注力预计增值 ${Math.round(parseFloat(focusHours) * 60)}min。`
            : state === "deficit"
              ? `🔴 当前处于生理空头，下午 ${crashTime} 存在宕机风险，建议立即补救。`
              : `⚡ ${t.perfNeutralDesc}`}
        </div>

        {/* Deficit flash warning */}
        {state === "deficit" && (
          <div
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg animate-pulse"
            style={{ background: "hsl(0, 72%, 55%, 0.08)", border: "1px solid hsl(0, 72%, 55%, 0.2)" }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-destructive" />
            <span className="text-[10px] font-mono font-bold text-destructive">
              {t.perfDeficitWarning(crashTime, perfLoss)}
            </span>
          </div>
        )}

        {/* Hedge button for deficit */}
        {state === "deficit" && !hedgeApplied && (
          <button
            onClick={() => setShowHedge(true)}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold tracking-wider border transition-all active:scale-[0.98]"
            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
          >
            🛡 资产救市 · 对冲包 (Hedge)
          </button>
        )}

        {/* Hedge applied badge */}
        {hedgeApplied && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono font-bold animate-fade-in"
            style={{ background: "hsl(160, 70%, 45%, 0.08)", color: "hsl(160, 70%, 45%)", border: "1px solid hsl(160, 70%, 45%, 0.2)" }}
          >
            ✅ {t.perfHedgeApplied}: {hedgeApplied}
          </div>
        )}
      </div>

      {/* Hedge options panel */}
      {showHedge && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono tracking-wider uppercase text-muted-foreground">
              {t.perfHedgeTitle}
            </span>
            <button onClick={() => setShowHedge(false)} className="p-1 text-muted-foreground/40 hover:text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {hedgeOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => { setHedgeApplied(opt.label); setShowHedge(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] hover:bg-secondary/30"
                  style={{ borderColor: cfg.border }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-xs font-mono font-bold text-card-foreground">{opt.label}</span>
                    <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{opt.effect}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nutrition mini-bars */}
      <div className="px-4 pb-3 flex items-center gap-3">
        {[
          { label: t.energy, val: todayTotals.calories, tgt: targets.calories },
          { label: t.protein, val: todayTotals.protein_g, tgt: targets.protein_g },
          { label: t.fat, val: todayTotals.fat_g, tgt: targets.fat_g },
          { label: t.carbs, val: todayTotals.carbs_g, tgt: targets.carbs_g },
        ].map(item => {
          const pct = item.tgt > 0 ? Math.min(item.val / item.tgt, 1) : 0;
          const over = item.val > item.tgt;
          return (
            <div key={item.label} className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-mono text-muted-foreground/40">{item.label}</span>
                <span className={`text-[8px] font-mono font-bold ${over ? "text-destructive" : "text-card-foreground/70"}`}>
                  {Math.round(item.val)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${over ? "bg-destructive" : ""}`}
                  style={{ width: `${pct * 100}%`, background: over ? undefined : cfg.fill }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
