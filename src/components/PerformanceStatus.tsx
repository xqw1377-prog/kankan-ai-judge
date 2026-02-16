import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Droplets, Footprints, Coffee, X } from "lucide-react";

interface Props {
  todayTotals: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
  targets: { calories: number; protein_g: number; fat_g: number; carbs_g: number };
}

type PerfState = "surplus" | "deficit" | "neutral";

function computePerf(totals: Props["todayTotals"], targets: Props["targets"]) {
  const calRatio = targets.calories > 0 ? totals.calories / targets.calories : 0;
  const proteinRatio = targets.protein_g > 0 ? totals.protein_g / targets.protein_g : 0;
  const fatRatio = targets.fat_g > 0 ? totals.fat_g / targets.fat_g : 0;

  // Good: moderate calories, high protein ratio, low fat ratio
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

  const [animLevel, setAnimLevel] = useState(5);
  useEffect(() => {
    const timer = setTimeout(() => setAnimLevel(battery), 500);
    return () => clearTimeout(timer);
  }, [battery]);

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
      fill: "hsl(160, 70%, 45%, 0.35)",
    },
    deficit: {
      color: "hsl(0, 72%, 55%)",
      bg: "hsl(0, 72%, 55%, 0.06)",
      border: "hsl(0, 72%, 55%, 0.25)",
      fill: "hsl(0, 72%, 55%, 0.4)",
    },
    neutral: {
      color: "hsl(43, 80%, 52%)",
      bg: "hsl(43, 80%, 52%, 0.06)",
      border: "hsl(43, 80%, 52%, 0.2)",
      fill: "hsl(43, 80%, 52%, 0.25)",
    },
  }[state];

  const hedgeOptions = [
    { key: "water", icon: Droplets, label: t.perfHedgeWater, effect: t.perfHedgeWaterEffect },
    { key: "walk", icon: Footprints, label: t.perfHedgeWalk, effect: t.perfHedgeWalkEffect },
    { key: "rest", icon: Coffee, label: t.perfHedgeRest, effect: t.perfHedgeRestEffect },
  ];

  const BatteryIcon = battery >= 70 ? BatteryFull : battery >= 40 ? BatteryMedium : BatteryLow;

  return (
    <div
      className="glass rounded-2xl overflow-hidden border transition-all duration-700"
      style={{ borderColor: cfg.border, background: cfg.bg }}
    >
      {state === "deficit" && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse rounded-2xl"
          style={{ background: `radial-gradient(ellipse at center, hsl(0 72% 55% / 0.06) 0%, transparent 70%)` }}
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

        {/* Main content: battery + status text */}
        <div className="flex items-center gap-4">
          {/* Battery SVG */}
          <div className="shrink-0 relative">
            <div
              className="w-14 h-8 rounded-md border-2 relative overflow-hidden"
              style={{ borderColor: cfg.border, background: "hsl(var(--background))" }}
            >
              {/* Battery tip */}
              <div
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-r-sm"
                style={{ background: cfg.border }}
              />
              {/* Fill bar */}
              <div
                className="absolute inset-y-0.5 left-0.5 rounded-sm transition-all duration-[1.5s] ease-out"
                style={{
                  width: `${animLevel}%`,
                  background: cfg.fill,
                  boxShadow: `0 0 8px ${cfg.fill}`,
                }}
              />
            </div>
            <span
              className="block text-center text-[8px] font-mono font-bold mt-1"
              style={{ color: cfg.color }}
            >
              {battery}%
            </span>
          </div>

          {/* Status description */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-mono font-bold leading-snug ${state === "deficit" ? "animate-pulse" : ""}`}
              style={{ color: cfg.color }}
            >
              {state === "surplus"
                ? `🔋 ${t.perfSurplusDesc(focusHours, sustainTime)}`
                : state === "deficit"
                  ? `🧠💥 ${t.perfDeficitDesc(crashTime, perfLoss)}`
                  : `⚡ ${t.perfNeutralDesc}`}
            </p>
          </div>
        </div>

        {/* Hedge button for deficit */}
        {state === "deficit" && !hedgeApplied && (
          <button
            onClick={() => setShowHedge(true)}
            className="mt-3 w-full py-2 rounded-xl text-[11px] font-mono font-bold tracking-wider border transition-all active:scale-[0.98]"
            style={{
              color: cfg.color,
              borderColor: cfg.border,
              background: cfg.bg,
            }}
          >
            🛡 {t.perfHedgeBtn}
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
          { label: t.energy, val: todayTotals.calories, tgt: targets.calories, unit: "kcal" },
          { label: t.protein, val: todayTotals.protein_g, tgt: targets.protein_g, unit: "g" },
          { label: t.fat, val: todayTotals.fat_g, tgt: targets.fat_g, unit: "g" },
          { label: t.carbs, val: todayTotals.carbs_g, tgt: targets.carbs_g, unit: "g" },
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
                  style={{
                    width: `${pct * 100}%`,
                    background: over ? undefined : cfg.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
