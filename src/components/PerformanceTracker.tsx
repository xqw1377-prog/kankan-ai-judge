import { useMemo, useRef, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface PerformanceTrackerProps {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  targetCalories: number;
  weight?: number;
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
  const kgPerKcal = 1 / 7700; // ~7700 kcal per kg
  for (let i = 1; i <= 7; i++) {
    pts.push(currentWeight - dailyDeficit * kgPerKcal * i);
  }
  return pts;
}

export default function PerformanceTracker({
  calories,
  targetCalories,
  weight = 70,
}: PerformanceTrackerProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animProgress, setAnimProgress] = useState(0);

  const dailyDeficit = targetCalories - calories;
  const history = useMemo(() => generateHistory(weight), [weight]);
  const prediction = useMemo(() => generatePrediction(weight, dailyDeficit), [weight, dailyDeficit]);

  const allPoints = useMemo(() => [...history, ...prediction.slice(1)], [history, prediction]);
  const minVal = Math.min(...allPoints) - 0.5;
  const maxVal = Math.max(...allPoints) + 0.5;

  // Animate on mount and when calories change
  useEffect(() => {
    setAnimProgress(0);
    let start: number | null = null;
    const duration = 800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      // Deceleration easing
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

    // Clear
    ctx.clearRect(0, 0, w, h);

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

    // "Today" label
    ctx.fillStyle = "rgba(212,175,55,0.6)";
    ctx.font = "bold 8px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TODAY", todayX, padT + chartH + 14);

    // Historical line (fluorescent green)
    const drawAnimatedCount = Math.ceil(animProgress * todayIdx) + 1;
    ctx.strokeStyle = "rgba(57,255,20,0.8)";
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
    ctx.strokeStyle = "rgba(57,255,20,0.15)";
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
      ctx.fillStyle = "rgba(57,255,20,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Prediction dashed line
    if (animProgress > 0.3) {
      const predAlpha = Math.min(1, (animProgress - 0.3) / 0.7);
      ctx.strokeStyle = `rgba(57,255,20,${0.4 * predAlpha})`;
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

      // Prediction glow
      ctx.strokeStyle = `rgba(57,255,20,${0.06 * predAlpha})`;
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

      // Prediction dots (hollow)
      for (let i = 1; i < prediction.length; i++) {
        const x = toX(todayIdx + i);
        const y = toY(prediction[i]);
        ctx.strokeStyle = `rgba(57,255,20,${0.5 * predAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // End label
      const lastPred = prediction[prediction.length - 1];
      const endX = toX(totalPts - 1);
      const endY = toY(lastPred);
      ctx.fillStyle = `rgba(57,255,20,${0.7 * predAlpha})`;
      ctx.font = "bold 9px 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${lastPred.toFixed(1)}kg`, endX + 4, endY + 3);
    }

    // Today's point (gold highlight)
    const tx = toX(todayIdx);
    const ty = toY(history[todayIdx]);
    // Gold glow
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 12);
    glow.addColorStop(0, "rgba(212,175,55,0.4)");
    glow.addColorStop(1, "rgba(212,175,55,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    // Gold dot
    ctx.fillStyle = "rgba(212,175,55,1)";
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fill();

  }, [allPoints, history, prediction, minVal, maxVal, animProgress]);

  const deficit = dailyDeficit;
  const deficitLabel = deficit > 0
    ? `−${Math.abs(Math.round(deficit))} kcal`
    : `+${Math.abs(Math.round(deficit))} kcal`;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.18s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.performanceTracker} <span className="flex-1 h-px bg-border" />
      </h3>
      <div className="glass rounded-2xl p-4 shadow-card relative overflow-hidden">
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
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {t.dailyBalance}
            </span>
            <div className={`text-sm font-bold mt-0.5 ${deficit > 0 ? "text-success" : "text-warning"}`}>
              {deficitLabel}
            </div>
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
            <div className="w-3 h-0.5 rounded-full" style={{ background: "rgba(57,255,20,0.8)" }} />
            <span className="text-[9px] text-muted-foreground">{t.actual}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full opacity-50" style={{ background: "rgba(57,255,20,0.5)", borderTop: "1px dashed rgba(57,255,20,0.5)" }} />
            <span className="text-[9px] text-muted-foreground">{t.predicted7d}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
