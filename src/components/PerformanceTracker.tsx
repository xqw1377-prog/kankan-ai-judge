import { useMemo, useRef, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface PerformanceTrackerProps {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  targetCalories: number;
  weight?: number;
  gi_value?: number;
}

// Generate mock historical data points (past 7 days)
function generateHistory(currentWeight: number): number[] {
  const pts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    pts.push(currentWeight + (Math.random() - 0.4) * 0.8 * (i / 3));
  }
  return pts;
}

// Generate predicted future data (next 7 days) based on caloric balance
function generatePrediction(currentWeight: number, dailyDeficit: number): number[] {
  const pts: number[] = [currentWeight];
  const kgPerKcal = 1 / 7700;
  for (let i = 1; i <= 7; i++) {
    pts.push(currentWeight - dailyDeficit * kgPerKcal * i);
  }
  return pts;
}

// Estimate glycemic load risk: uses explicit gi_value if provided, otherwise estimates from macros
function estimateGLRisk(carbs_g: number, calories: number, gi_value?: number): { isHigh: boolean; level: number; isLow: boolean } {
  if (gi_value !== undefined) {
    const isHigh = gi_value >= 70;
    const isLow = gi_value <= 40;
    const level = Math.min(1, Math.max(0, (gi_value - 55) / 45));
    return { isHigh, level, isLow };
  }
  if (calories <= 0) return { isHigh: false, level: 0, isLow: false };
  const carbCalRatio = (carbs_g * 4) / calories;
  const isHigh = carbCalRatio > 0.6 && carbs_g > 50;
  const level = Math.min(1, Math.max(0, (carbCalRatio - 0.5) * 5));
  return { isHigh, level, isLow: carbCalRatio < 0.3 };
}

export default function PerformanceTracker({
  calories,
  protein_g,
  fat_g,
  carbs_g,
  targetCalories,
  weight = 70,
  gi_value,
}: PerformanceTrackerProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [shakeOffset, setShakeOffset] = useState(0);
  const shakeRef = useRef<number>();

  const dailyDeficit = targetCalories - calories;
  const history = useMemo(() => generateHistory(weight), [weight]);
  const prediction = useMemo(() => generatePrediction(weight, dailyDeficit), [weight, dailyDeficit]);
  const glRisk = useMemo(() => estimateGLRisk(carbs_g, calories, gi_value), [carbs_g, calories, gi_value]);

  const allPoints = useMemo(() => [...history, ...prediction.slice(1)], [history, prediction]);
  const minVal = Math.min(...allPoints) - 0.5;
  const maxVal = Math.max(...allPoints) + 0.5;

  // Red shake animation when high GL
  useEffect(() => {
    if (!glRisk.isHigh) {
      setShakeOffset(0);
      return;
    }
    let startTime: number | null = null;
    const duration = 1500;
    const intensity = 3 * glRisk.level;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      if (elapsed > duration) {
        setShakeOffset(0);
        return;
      }
      const decay = 1 - elapsed / duration;
      const freq = 25;
      setShakeOffset(Math.sin(elapsed / freq) * intensity * decay);
      shakeRef.current = requestAnimationFrame(animate);
    };
    shakeRef.current = requestAnimationFrame(animate);
    return () => { if (shakeRef.current) cancelAnimationFrame(shakeRef.current); };
  }, [glRisk.isHigh, glRisk.level, carbs_g]);

  // Animate on mount and when calories change
  useEffect(() => {
    setAnimProgress(0);
    let start: number | null = null;
    const duration = 800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setAnimProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [calories]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padL = 36, padR = 12, padT = 16, padB = 24;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const totalPts = allPoints.length;

    const toX = (i: number) => padL + (i / (totalPts - 1)) * chartW;
    const toY = (v: number) => padT + (1 - (v - minVal) / (maxVal - minVal)) * chartH;

    ctx.clearRect(0, 0, w, h);

    // Red danger zone overlay when high GL
    if (glRisk.isHigh && animProgress > 0.5) {
      const dangerAlpha = 0.06 * glRisk.level * Math.min(1, (animProgress - 0.5) * 4);
      ctx.fillStyle = `rgba(255,50,50,${dangerAlpha})`;
      ctx.fillRect(padL, padT, chartW, chartH);
      // Red grid pulse
      ctx.strokeStyle = `rgba(255,50,50,${0.08 * glRisk.level})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const y = padT + (i / 3) * chartH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.stroke();
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(160,174,192,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const y = padT + (i / 3) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(160,174,192,0.5)";
    ctx.font = "9px 'Space Grotesk', sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i < 4; i++) {
      const val = maxVal - (i / 3) * (maxVal - minVal);
      const y = padT + (i / 3) * chartH;
      ctx.fillText(val.toFixed(1), padL - 4, y + 3);
    }

    // Today divider line
    const todayIdx = history.length - 1;
    const todayX = toX(todayIdx);
    ctx.strokeStyle = "rgba(212,175,55,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(todayX, padT);
    ctx.lineTo(todayX, padT + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(212,175,55,0.6)";
    ctx.font = "bold 8px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TODAY", todayX, padT + chartH + 14);

    // K-line colors: red for high GI (震荡阴线), gold for low GI (阳线), green default
    const lineColor = glRisk.isHigh ? "rgba(255,80,60,0.85)" : glRisk.isLow ? "rgba(212,175,55,0.9)" : "rgba(57,255,20,0.8)";
    const glowColor = glRisk.isHigh ? "rgba(255,80,60,0.15)" : glRisk.isLow ? "rgba(212,175,55,0.12)" : "rgba(57,255,20,0.15)";
    const dotColor = glRisk.isHigh ? "rgba(255,80,60,0.9)" : glRisk.isLow ? "rgba(212,175,55,0.9)" : "rgba(57,255,20,0.9)";

    const drawAnimatedCount = Math.ceil(animProgress * todayIdx) + 1;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < Math.min(drawAnimatedCount, history.length); i++) {
      const x = toX(i);
      const y = toY(history[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Historical glow
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < Math.min(drawAnimatedCount, history.length); i++) {
      const x = toX(i);
      const y = toY(history[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Historical data points
    for (let i = 0; i < Math.min(drawAnimatedCount, history.length); i++) {
      const x = toX(i);
      const y = toY(history[i]);
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Prediction dashed line
    if (animProgress > 0.3) {
      const predAlpha = Math.min(1, (animProgress - 0.3) / 0.7);
      const predColor = glRisk.isHigh ? `rgba(255,80,60,${0.4 * predAlpha})` : glRisk.isLow ? `rgba(212,175,55,${0.4 * predAlpha})` : `rgba(57,255,20,${0.4 * predAlpha})`;
      const predGlow = glRisk.isHigh ? `rgba(255,80,60,${0.06 * predAlpha})` : glRisk.isLow ? `rgba(212,175,55,${0.06 * predAlpha})` : `rgba(57,255,20,${0.06 * predAlpha})`;
      const predDot = glRisk.isHigh ? `rgba(255,80,60,${0.5 * predAlpha})` : glRisk.isLow ? `rgba(212,175,55,${0.5 * predAlpha})` : `rgba(57,255,20,${0.5 * predAlpha})`;
      const predLabel = glRisk.isHigh ? `rgba(255,80,60,${0.7 * predAlpha})` : glRisk.isLow ? `rgba(212,175,55,${0.7 * predAlpha})` : `rgba(57,255,20,${0.7 * predAlpha})`;

      ctx.strokeStyle = predColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < prediction.length; i++) {
        const x = toX(todayIdx + i);
        const y = toY(prediction[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = predGlow;
      ctx.lineWidth = 8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < prediction.length; i++) {
        const x = toX(todayIdx + i);
        const y = toY(prediction[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 1; i < prediction.length; i++) {
        const x = toX(todayIdx + i);
        const y = toY(prediction[i]);
        ctx.strokeStyle = predDot;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const lastPred = prediction[prediction.length - 1];
      const endX = toX(totalPts - 1);
      const endY = toY(lastPred);
      ctx.fillStyle = predLabel;
      ctx.font = "bold 9px 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${lastPred.toFixed(1)}kg`, endX + 4, endY + 3);
    }

    // Today's point (gold highlight)
    const tx = toX(todayIdx);
    const ty = toY(history[todayIdx]);
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 12);
    glow.addColorStop(0, glRisk.isHigh ? "rgba(255,50,50,0.5)" : "rgba(212,175,55,0.4)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = glRisk.isHigh ? "rgba(255,50,50,1)" : "rgba(212,175,55,1)";
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fill();

  }, [allPoints, history, prediction, minVal, maxVal, animProgress, glRisk]);

  const deficit = dailyDeficit;
  const deficitLabel = deficit > 0
    ? `−${Math.abs(Math.round(deficit))} kcal`
    : `+${Math.abs(Math.round(deficit))} kcal`;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.18s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.performanceTracker} <span className="flex-1 h-px bg-border" />
      </h3>
      <div
        className={`glass rounded-2xl p-4 shadow-card relative overflow-hidden transition-all ${
          glRisk.isHigh ? "ring-1 ring-destructive/30" : ""
        }`}
        style={{ transform: shakeOffset ? `translateX(${shakeOffset}px)` : undefined }}
      >
        {/* Red pulse overlay for GL warning */}
        {glRisk.isHigh && (
          <div className="absolute inset-0 pointer-events-none animate-breathe rounded-2xl"
            style={{ background: "radial-gradient(ellipse at center, rgba(255,50,50,0.06) 0%, transparent 70%)" }}
          />
        )}

        {/* Header stats */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {t.weightTrend}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-card-foreground">{weight}</span>
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <div className="text-right">
            {glRisk.isHigh ? (
              <>
                <span className="text-[10px] text-destructive uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
                  ⚠️ {t.glRiskWarning}
                </span>
                <div className="text-xs font-bold mt-0.5 text-destructive animate-pulse-soft">
                  GL {t.glHigh}
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t.dailyBalance}
                </span>
                <div className={`text-sm font-bold mt-0.5 ${deficit > 0 ? "text-success" : "text-warning"}`}>
                  {deficitLabel}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas chart */}
        <div className="relative" style={{ height: 160 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: "100%", height: 160 }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ background: glRisk.isHigh ? "rgba(255,80,60,0.8)" : glRisk.isLow ? "rgba(212,175,55,0.8)" : "rgba(57,255,20,0.8)" }} />
            <span className="text-[9px] text-muted-foreground">{t.actual}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full opacity-50" style={{ background: glRisk.isHigh ? "rgba(255,80,60,0.5)" : glRisk.isLow ? "rgba(212,175,55,0.5)" : "rgba(57,255,20,0.5)" }} />
            <span className="text-[9px] text-muted-foreground">{t.predicted7d}</span>
          </div>
          {glRisk.isHigh && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive/80 animate-pulse-soft" />
              <span className="text-[9px] text-destructive font-semibold">{t.glRiskWarning}</span>
            </div>
          )}
          {glRisk.isLow && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: "rgba(212,175,55,0.8)" }} />
              <span className="text-[9px] font-semibold text-glow-gold" style={{ color: "hsl(43, 72%, 55%)" }}>{t.giLow}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
