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

function generateHistory(currentWeight: number): number[] {
  const pts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    pts.push(currentWeight + (Math.random() - 0.4) * 0.8 * (i / 3));
  }
  return pts;
}

function generatePrediction(currentWeight: number, dailyDeficit: number): number[] {
  const pts: number[] = [currentWeight];
  const kgPerKcal = 1 / 7700;
  for (let i = 1; i <= 7; i++) {
    pts.push(currentWeight - dailyDeficit * kgPerKcal * i);
  }
  return pts;
}

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
  calories, protein_g, fat_g, carbs_g, targetCalories, weight = 70, gi_value,
}: PerformanceTrackerProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [shakeOffset, setShakeOffset] = useState(0);
  const [breathePhase, setBreathePhase] = useState(0);
  const shakeRef = useRef<number>();
  const breatheRef = useRef<number>();

  const dailyDeficit = targetCalories - calories;
  const history = useMemo(() => generateHistory(weight), [weight]);
  const prediction = useMemo(() => generatePrediction(weight, dailyDeficit), [weight, dailyDeficit]);
  const glRisk = useMemo(() => estimateGLRisk(carbs_g, calories, gi_value), [carbs_g, calories, gi_value]);

  const allPoints = useMemo(() => [...history, ...prediction.slice(1)], [history, prediction]);
  const minVal = Math.min(...allPoints) - 0.5;
  const maxVal = Math.max(...allPoints) + 0.5;

  // Shake animation for high GL
  useEffect(() => {
    if (!glRisk.isHigh) { setShakeOffset(0); return; }
    let startTime: number | null = null;
    const duration = 1500;
    const intensity = 3 * glRisk.level;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      if (elapsed > duration) { setShakeOffset(0); return; }
      const decay = 1 - elapsed / duration;
      setShakeOffset(Math.sin(elapsed / 25) * intensity * decay);
      shakeRef.current = requestAnimationFrame(animate);
    };
    shakeRef.current = requestAnimationFrame(animate);
    return () => { if (shakeRef.current) cancelAnimationFrame(shakeRef.current); };
  }, [glRisk.isHigh, glRisk.level, carbs_g]);

  // Breathing animation for prediction section
  useEffect(() => {
    const animate = (ts: number) => {
      setBreathePhase((ts % 3000) / 3000);
      breatheRef.current = requestAnimationFrame(animate);
    };
    breatheRef.current = requestAnimationFrame(animate);
    return () => { if (breatheRef.current) cancelAnimationFrame(breatheRef.current); };
  }, []);

  // Animate on mount
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

  // Draw smooth glow area chart
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
    const baselineY = padT + chartH;

    ctx.clearRect(0, 0, w, h);

    // Danger zone overlay for high GL
    if (glRisk.isHigh && animProgress > 0.5) {
      const dangerAlpha = 0.06 * glRisk.level * Math.min(1, (animProgress - 0.5) * 4);
      ctx.fillStyle = `rgba(255,50,50,${dangerAlpha})`;
      ctx.fillRect(padL, padT, chartW, chartH);
    }

    // Grid lines (subtle medical monitor style)
    ctx.strokeStyle = "rgba(160,174,192,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(160,174,192,0.4)";
    ctx.font = "9px 'Space Grotesk', sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i < 5; i++) {
      const val = maxVal - (i / 4) * (maxVal - minVal);
      const y = padT + (i / 4) * chartH;
      ctx.fillText(val.toFixed(1), padL - 4, y + 3);
    }

    // Today divider
    const todayIdx = history.length - 1;
    const todayX = toX(todayIdx);
    ctx.strokeStyle = "rgba(212,175,55,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(todayX, padT);
    ctx.lineTo(todayX, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.font = "bold 8px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TODAY", todayX, baselineY + 14);

    // Color scheme based on GL risk
    const isStress = glRisk.isHigh;
    const isGain = glRisk.isLow;
    const lineHSL = isStress ? "hsl(0,72%,55%)" : isGain ? "hsl(43,72%,52%)" : "hsl(160,60%,45%)";
    const glowR = isStress ? [255, 50, 50] : isGain ? [212, 175, 55] : [57, 200, 100];

    // Helper: build smooth cubic bezier path through points
    const buildSmoothPath = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return;
      ctx.moveTo(points[0].x, points[0].y);
      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
        return;
      }
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    };

    // ═══ Historical: Smooth Glow Area ═══
    const drawAnimatedCount = Math.ceil(animProgress * todayIdx) + 1;
    const histPoints = history.slice(0, Math.min(drawAnimatedCount, history.length)).map((v, i) => ({
      x: toX(i), y: toY(v),
    }));

    if (histPoints.length >= 2) {
      // Area fill with gradient
      const areaGrad = ctx.createLinearGradient(0, padT, 0, baselineY);
      areaGrad.addColorStop(0, `rgba(${glowR[0]},${glowR[1]},${glowR[2]},0.18)`);
      areaGrad.addColorStop(0.6, `rgba(${glowR[0]},${glowR[1]},${glowR[2]},0.06)`);
      areaGrad.addColorStop(1, `rgba(${glowR[0]},${glowR[1]},${glowR[2]},0)`);

      ctx.beginPath();
      buildSmoothPath(histPoints);
      // Close path down to baseline for area fill
      ctx.lineTo(histPoints[histPoints.length - 1].x, baselineY);
      ctx.lineTo(histPoints[0].x, baselineY);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Glow line (wide blur)
      ctx.strokeStyle = `rgba(${glowR[0]},${glowR[1]},${glowR[2]},0.12)`;
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      buildSmoothPath(histPoints);
      ctx.stroke();

      // Main line
      ctx.strokeStyle = lineHSL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      buildSmoothPath(histPoints);
      ctx.stroke();
    }

    // ═══ Prediction: Smooth dashed glow with breathing ═══
    if (animProgress > 0.3 && prediction.length >= 2) {
      const predAlpha = Math.min(1, (animProgress - 0.3) / 0.7);
      // Breathing opacity oscillation
      const breathe = 0.6 + 0.4 * Math.sin(breathePhase * Math.PI * 2);
      const alpha = predAlpha * breathe;

      const predPoints = prediction.map((v, i) => ({
        x: toX(todayIdx + i), y: toY(v),
      }));

      // Prediction area (faint)
      const predGrad = ctx.createLinearGradient(0, padT, 0, baselineY);
      predGrad.addColorStop(0, `rgba(${glowR[0]},${glowR[1]},${glowR[2]},${0.08 * alpha})`);
      predGrad.addColorStop(1, `rgba(${glowR[0]},${glowR[1]},${glowR[2]},0)`);

      ctx.beginPath();
      buildSmoothPath(predPoints);
      ctx.lineTo(predPoints[predPoints.length - 1].x, baselineY);
      ctx.lineTo(predPoints[0].x, baselineY);
      ctx.closePath();
      ctx.fillStyle = predGrad;
      ctx.fill();

      // Prediction glow
      ctx.strokeStyle = `rgba(${glowR[0]},${glowR[1]},${glowR[2]},${0.08 * alpha})`;
      ctx.lineWidth = 8;
      ctx.setLineDash([]);
      ctx.beginPath();
      buildSmoothPath(predPoints);
      ctx.stroke();

      // Prediction dashed line
      ctx.strokeStyle = `rgba(${glowR[0]},${glowR[1]},${glowR[2]},${0.5 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      buildSmoothPath(predPoints);
      ctx.stroke();
      ctx.setLineDash([]);

      // End label
      const lastPred = prediction[prediction.length - 1];
      const endX = toX(totalPts - 1);
      const endY = toY(lastPred);
      ctx.fillStyle = `rgba(${glowR[0]},${glowR[1]},${glowR[2]},${0.7 * predAlpha})`;
      ctx.font = "bold 9px 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${lastPred.toFixed(1)}kg`, endX + 4, endY + 3);

      // Small "AI" label near prediction start
      ctx.fillStyle = `rgba(${glowR[0]},${glowR[1]},${glowR[2]},${0.3 * alpha})`;
      ctx.font = "bold 7px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AI", toX(todayIdx + 1), toY(prediction[1]) - 8);
    }

    // Today's point (radial glow)
    const tx = toX(todayIdx);
    const ty = toY(history[todayIdx]);
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14);
    glow.addColorStop(0, isStress ? "rgba(255,50,50,0.45)" : "rgba(212,175,55,0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isStress ? "rgba(255,50,50,1)" : "rgba(212,175,55,1)";
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fill();

  }, [allPoints, history, prediction, minVal, maxVal, animProgress, glRisk, breathePhase]);

  // Generate GL heatmap data (simulated hourly GL distribution)
  const glHeatmapData = useMemo(() => {
    const data: number[] = [];
    for (let i = 0; i < 14; i++) {
      const base = glRisk.isHigh ? 0.6 : glRisk.isLow ? 0.2 : 0.4;
      data.push(Math.min(1, Math.max(0, base + (Math.random() - 0.5) * 0.4)));
    }
    return data;
  }, [glRisk.isHigh, glRisk.isLow]);

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
              <span className="text-lg font-bold text-card-foreground font-mono">{weight}</span>
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <div className="text-right">
            {glRisk.isHigh ? (
              <>
                <span className="text-[10px] text-destructive uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
                  ⚠️ {t.glRiskWarning}
                </span>
                <div className="text-xs font-bold mt-0.5 text-destructive animate-pulse-soft font-mono">
                  GL {t.glHigh}
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t.dailyBalance}
                </span>
                <div className={`text-sm font-bold mt-0.5 font-mono ${deficit > 0 ? "text-success" : "text-warning"}`}>
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

        {/* GL Distribution Heatmap */}
        <div className="mt-3 mb-1">
          <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
            GL Distribution
          </p>
          <div className="flex gap-[2px] h-3 rounded overflow-hidden">
            {glHeatmapData.map((v, i) => {
              // Deep blue → titanium gold gradient based on GL intensity
              const r = Math.round(20 + v * 192);
              const g = Math.round(30 + v * 145);
              const b = Math.round(80 + (1 - v) * 100);
              const alpha = 0.5 + v * 0.5;
              return (
                <div
                  key={i}
                  className="flex-1 transition-all duration-700"
                  style={{
                    background: `rgba(${r},${g},${b},${alpha})`,
                    boxShadow: v > 0.7 ? `0 0 6px rgba(${r},${g},${b},0.4)` : undefined,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-muted-foreground" style={{ opacity: 0.5 }}>Low GL</span>
            <span className="text-[7px] text-muted-foreground" style={{ opacity: 0.5 }}>High GL</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ background: glRisk.isHigh ? "hsl(0,72%,55%)" : glRisk.isLow ? "hsl(43,72%,52%)" : "hsl(160,60%,45%)" }} />
            <span className="text-[9px] text-muted-foreground">{t.actual}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full opacity-50" style={{
              background: glRisk.isHigh ? "hsl(0,72%,55%)" : glRisk.isLow ? "hsl(43,72%,52%)" : "hsl(160,60%,45%)",
              animation: "breathe 3s ease-in-out infinite",
            }} />
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
              <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: "hsl(43,72%,52%)" }} />
              <span className="text-[9px] font-semibold" style={{ color: "hsl(43, 72%, 55%)" }}>{t.giLow}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
