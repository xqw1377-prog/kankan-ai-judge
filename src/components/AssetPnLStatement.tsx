import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Activity, TrendingUp, Archive } from "lucide-react";

interface Props {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  suggestion: string;
  isWarning: boolean;
  isGreen: boolean;
  meals: any[];
  profile: any;
}

function renderSuggestionBold(text: string) {
  return text.split(/(【[^】]+】)/g).map((part, i) =>
    part.startsWith("【") && part.endsWith("】")
      ? <strong key={i} className="text-primary font-bold">{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  );
}

/** Compute a simple "brain battery" level 0-100 */
function computeBatteryLevel(protein: number, fat: number, carbs: number, calories: number): number {
  // High protein & moderate carbs → high charge; excessive fat/carbs → drain
  const proteinScore = Math.min(protein * 1.2, 40);
  const fiberEstimate = carbs * 0.08;
  const fiberScore = Math.min(fiberEstimate * 2, 20);
  const carbPenalty = Math.max(0, (carbs - 60) * 0.3);
  const fatPenalty = Math.max(0, (fat - 25) * 0.4);
  return Math.max(5, Math.min(100, Math.round(50 + proteinScore + fiberScore - carbPenalty - fatPenalty)));
}

type PnLState = "surplus" | "deficit" | "neutral";

export default function AssetPnLStatement({ calories, protein_g, fat_g, carbs_g, suggestion, isWarning, isGreen, meals, profile }: Props) {
  const { t } = useI18n();

  const battery = useMemo(() => computeBatteryLevel(protein_g, fat_g, carbs_g, calories), [protein_g, fat_g, carbs_g, calories]);
  const state: PnLState = isGreen ? "surplus" : isWarning ? "deficit" : "neutral";

  // Animated battery fill
  const [animLevel, setAnimLevel] = useState(5);
  useEffect(() => {
    const timer = setTimeout(() => setAnimLevel(battery), 400);
    return () => clearTimeout(timer);
  }, [battery]);

  // Compute focus minutes gained/lost
  const focusMinutes = useMemo(() => {
    if (state === "surplus") return Math.round((battery - 50) * 2.4);
    if (state === "deficit") return -Math.round((50 - battery) * 0.9);
    return 0;
  }, [battery, state]);

  const decisionLoss = state === "deficit" ? Math.min(60, Math.round((50 - battery) * 1.2)) : 0;
  const nowHour = new Date().getHours();
  const crashTime = `${Math.min(nowHour + 3, 23)}:00`;

  const stateConfig = {
    surplus: {
      color: "hsl(160, 70%, 45%)",
      bgGlow: "hsl(160, 70%, 45%, 0.06)",
      borderColor: "hsl(160, 70%, 45%, 0.25)",
      batteryFill: "hsl(160, 70%, 45%, 0.35)",
      batteryGlow: "hsl(160, 70%, 45%, 0.15)",
    },
    deficit: {
      color: "hsl(0, 72%, 55%)",
      bgGlow: "hsl(0, 72%, 55%, 0.06)",
      borderColor: "hsl(0, 72%, 55%, 0.25)",
      batteryFill: "hsl(0, 72%, 55%, 0.4)",
      batteryGlow: "hsl(0, 72%, 55%, 0.15)",
    },
    neutral: {
      color: "hsl(43, 80%, 52%)",
      bgGlow: "hsl(43, 80%, 52%, 0.06)",
      borderColor: "hsl(43, 80%, 52%, 0.2)",
      batteryFill: "hsl(43, 80%, 52%, 0.25)",
      batteryGlow: "hsl(43, 80%, 52%, 0.1)",
    },
  };

  const cfg = stateConfig[state];

  // 7-day sparkline data
  const sparkData = useMemo(() => {
    const now = new Date();
    const days: { label: string; score: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toDateString();
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayMeals = meals.filter((m: any) => new Date(m.recorded_at).toDateString() === dateStr);
      if (dayMeals.length === 0) { days.push({ label: dayLabel, score: 0 }); continue; }
      const totalCal = dayMeals.reduce((s: number, m: any) => s + m.calories, 0);
      const targetCal = profile?.target_calories || 2000;
      const ratio = totalCal / targetCal;
      const score = Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : Math.max(0, 200 - ratio * 100))));
      days.push({ label: dayLabel, score });
    }
    return days;
  }, [meals, profile]);

  const hasSparkData = sparkData.some(d => d.score > 0);

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.07s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.pnlTitle} <span className="flex-1 h-px bg-border" />
      </h3>

      <div
        className="rounded-2xl relative overflow-hidden border transition-all duration-700"
        style={{ borderColor: cfg.borderColor, background: cfg.bgGlow }}
      >
        {/* Deficit pulsing glow */}
        {state === "deficit" && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ background: `radial-gradient(ellipse at center, hsl(0 72% 55% / 0.08) 0%, transparent 70%)` }}
          />
        )}

        <div className="p-4 flex gap-4">
          {/* Battery Visual */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <div
              className="relative w-12 h-24 rounded-lg border-2 overflow-hidden"
              style={{ borderColor: cfg.borderColor, background: "hsl(var(--background))" }}
            >
              {/* Battery cap */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-t-sm"
                style={{ background: cfg.borderColor }}
              />
              {/* Fill */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-[1.5s] ease-out"
                style={{ height: `${animLevel}%`, background: cfg.batteryFill }}
              />
              {/* Glow overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-[1.5s] ease-out"
                style={{
                  height: `${animLevel}%`,
                  background: `linear-gradient(to top, ${cfg.batteryGlow}, transparent)`,
                }}
              />
              {/* Segment lines */}
              {[25, 50, 75].map(mark => (
                <div
                  key={mark}
                  className="absolute left-1 right-1 h-px"
                  style={{ bottom: `${mark}%`, background: cfg.borderColor, opacity: 0.3 }}
                />
              ))}
              {/* Percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-sm font-mono font-black"
                  style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.batteryGlow}` }}
                >
                  {battery}%
                </span>
              </div>
            </div>
            <span className="text-[7px] font-mono tracking-wider" style={{ color: cfg.color, opacity: 0.6 }}>
              {t.pnlBrainBattery}
            </span>
          </div>

          {/* P&L Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* State badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                  state === "deficit" ? "animate-pulse" : ""
                }`}
                style={{ background: cfg.bgGlow, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
              >
                {state === "surplus" ? "📈" : state === "deficit" ? "📉" : "➖"}
                {state === "surplus" ? t.pnlSurplus : state === "deficit" ? t.pnlDeficit : t.pnlNeutral}
              </div>
              <div
                className={`w-2 h-2 rounded-full ${state === "deficit" ? "animate-pulse" : ""}`}
                style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.batteryFill}` }}
              />
            </div>

            {/* P&L headline */}
            <p
              className={`text-xs leading-relaxed font-mono font-bold ${state === "deficit" ? "animate-pulse" : ""}`}
              style={{ color: cfg.color }}
            >
              {state === "surplus"
                ? `🔋 ${t.pnlSurplusDesc(focusMinutes)}`
                : state === "deficit"
                  ? `🧠💥 ${t.pnlDeficitDesc(crashTime, decisionLoss)}`
                  : `⚡ ${t.pnlNeutralDesc}`}
            </p>

            {/* Mini P&L breakdown */}
            <div className="flex items-center gap-3 mt-3">
              {[
                { label: "P", val: `${protein_g}g`, good: protein_g >= 20 },
                { label: "F", val: `${fat_g}g`, good: fat_g <= 25 },
                { label: "C", val: `${carbs_g}g`, good: carbs_g <= 80 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className="text-[7px] font-mono text-muted-foreground/40">{item.label}</span>
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{ color: item.good ? "hsl(160, 70%, 45%)" : "hsl(0, 72%, 55%)" }}
                  >
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actuarial Advice */}
        <div className="px-4 pb-3">
          <p className={`text-[11px] leading-relaxed font-mono ${
            isWarning ? "text-destructive/80" : isGreen ? "text-[hsl(160_60%_55%)]/80" : "text-card-foreground/70"
          }`}>
            💡 {renderSuggestionBold(suggestion)}
          </p>
        </div>

        {/* 7-Day Sparkline */}
        {hasSparkData && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3 h-3" style={{ color: cfg.color, opacity: 0.5 }} />
              <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase">
                {t.auditTrendTitle} · 7D
              </span>
            </div>
            <svg viewBox="0 0 200 40" className="w-full h-10" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const maxS = Math.max(...sparkData.map(d => d.score), 1);
                const pts = sparkData.map((d, i) => ({
                  x: 4 + (i / 6) * 192,
                  y: 36 - ((d.score / maxS) * 32),
                }));
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const area = `${line} L ${pts[6].x} 36 L ${pts[0].x} 36 Z`;
                return (
                  <>
                    <path d={area} fill="url(#pnl-fill)" />
                    <path d={line} fill="none" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) =>
                      sparkData[i].score > 0 ? (
                        <circle key={i} cx={p.x} cy={p.y} r="2" fill="hsl(var(--background))" stroke={cfg.color} strokeWidth="1.5" />
                      ) : null
                    )}
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between px-0.5">
              {sparkData.map((d, i) => (
                <span key={i} className="text-[7px] font-mono text-muted-foreground/30">{d.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ borderColor: cfg.borderColor }}>
          <div className="flex items-center gap-1.5">
            <Archive className="w-3 h-3 text-muted-foreground/30" />
            <span className="text-[8px] font-mono text-muted-foreground/30 tracking-wider">
              {t.auditDataCompressed}
            </span>
          </div>
          <span className="text-[8px] font-mono text-muted-foreground/20">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </section>
  );
}
