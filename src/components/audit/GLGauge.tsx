import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

interface GLGaugeProps {
  value: number; // 0-100 GL value
  max?: number;
}

const GLGauge = ({ value, max = 80 }: GLGaugeProps) => {
  const { t } = useI18n();
  const normalized = Math.min(100, (value / max) * 100);
  const angle = (normalized / 100) * 180; // 0 to 180 degrees for half circle
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 220;
    const h = 130;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h - 10;
    const r = 90;
    const lineWidth = 10;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = "hsl(220, 15%, 16%)";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Gradient arc
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, "hsl(200, 80%, 45%)");
    grad.addColorStop(0.4, "hsl(180, 60%, 40%)");
    grad.addColorStop(0.7, "hsl(43, 72%, 52%)");
    grad.addColorStop(1, "hsl(0, 72%, 55%)");

    const endAngle = Math.PI + (angle / 180) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Glow effect
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, endAngle);
    ctx.strokeStyle = normalized > 60 ? "hsl(0, 72%, 55%, 0.3)" : "hsl(43, 72%, 52%, 0.25)";
    ctx.lineWidth = lineWidth + 8;
    ctx.lineCap = "round";
    ctx.filter = "blur(6px)";
    ctx.stroke();
    ctx.filter = "none";

    // Needle dot
    const needleAngle = Math.PI + (angle / 180) * Math.PI;
    const nx = cx + r * Math.cos(needleAngle);
    const ny = cy + r * Math.sin(needleAngle);
    ctx.beginPath();
    ctx.arc(nx, ny, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "hsl(43, 72%, 52%)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nx, ny, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "hsl(43, 72%, 52%, 0.2)";
    ctx.fill();
  }, [value, angle, normalized, max]);

  const riskLabel = normalized > 70 ? t.auditHighPressure : normalized > 40 ? t.auditModerate : t.auditLowPressure;
  const riskColor = normalized > 70 ? "text-destructive" : normalized > 40 ? "text-primary" : "text-success";

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} />
      <div className="flex flex-col items-center -mt-3">
        <span className="text-2xl font-mono font-bold text-card-foreground">
          {value.toFixed(1)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{t.auditGlycemicLoad}</span>
        <span className={`text-[10px] font-mono font-bold mt-1 ${riskColor}`}>
          {riskLabel}
        </span>
      </div>
    </div>
  );
};

export default GLGauge;
