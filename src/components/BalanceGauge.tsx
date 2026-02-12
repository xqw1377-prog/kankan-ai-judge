import { useEffect, useRef, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

interface BalanceGaugeProps {
  totalWeight: number;
  claimedWeight: number;
  isBalanced: boolean;
}

export default function BalanceGauge({ totalWeight, claimedWeight, isBalanced }: BalanceGaugeProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentAngle = useRef(0);

  const ratio = totalWeight > 0 ? claimedWeight / totalWeight : 0;
  // Map ratio to angle: 0 = full left (-45deg), 1 = center (0deg), >1 = right (+45deg)
  const targetAngle = Math.max(-45, Math.min(45, (ratio - 1) * 90));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 280;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    let start: number | null = null;
    const startAngle = currentAngle.current;
    const duration = 600;

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function draw(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const angle = startAngle + (targetAngle - startAngle) * easedProgress;
      currentAngle.current = angle;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h - 20;
      const outerR = 110;
      const innerR = 85;

      // Arc background
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, Math.PI, 0, false);
      ctx.arc(cx, cy, innerR, 0, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = "hsl(220, 15%, 12%)";
      ctx.fill();

      // Gradient arc fill based on ratio
      const fillAngle = Math.PI + (Math.min(ratio, 1) * Math.PI);
      const grad = ctx.createLinearGradient(cx - outerR, cy, cx + outerR, cy);
      if (isBalanced) {
        grad.addColorStop(0, "hsl(43, 72%, 52%)");
        grad.addColorStop(0.5, "hsl(43, 80%, 60%)");
        grad.addColorStop(1, "hsl(43, 72%, 52%)");
      } else if (ratio > 1) {
        grad.addColorStop(0, "hsl(43, 72%, 42%)");
        grad.addColorStop(1, "hsl(0, 72%, 55%)");
      } else {
        grad.addColorStop(0, "hsl(220, 15%, 25%)");
        grad.addColorStop(1, "hsl(43, 72%, 52%)");
      }

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, Math.PI, fillAngle, false);
      ctx.arc(cx, cy, innerR, fillAngle, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        const isMajor = i % 5 === 0;
        const r1 = outerR + 2;
        const r2 = outerR + (isMajor ? 10 : 6);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.strokeStyle = isMajor ? "hsl(43, 72%, 52%)" : "hsl(220, 15%, 25%)";
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      // Pointer (needle)
      const needleAngle = Math.PI + ((angle + 45) / 90) * Math.PI;
      const needleLen = outerR - 10;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(needleAngle - Math.PI / 2);

      // Needle shadow
      ctx.shadowColor = isBalanced ? "hsl(43, 72%, 52%)" : "hsl(0, 0%, 0%)";
      ctx.shadowBlur = isBalanced ? 12 : 4;

      ctx.beginPath();
      ctx.moveTo(0, -needleLen);
      ctx.lineTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.closePath();
      ctx.fillStyle = isBalanced ? "hsl(43, 72%, 60%)" : "hsl(215, 20%, 72%)";
      ctx.fill();

      ctx.shadowBlur = 0;

      // Pivot circle
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = isBalanced ? "hsl(43, 72%, 52%)" : "hsl(220, 15%, 20%)";
      ctx.fill();
      ctx.strokeStyle = isBalanced ? "hsl(43, 80%, 65%)" : "hsl(220, 15%, 30%)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Labels
      ctx.font = "bold 10px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.textAlign = "left";
      ctx.fillText("0", cx - outerR - 8, cy + 14);
      ctx.textAlign = "right";
      ctx.fillText(`${totalWeight}g`, cx + outerR + 8, cy + 14);

      // Center value
      ctx.textAlign = "center";
      ctx.font = "bold 22px 'Space Grotesk', sans-serif";
      ctx.fillStyle = isBalanced ? "hsl(43, 72%, 52%)" : "hsl(215, 20%, 80%)";
      if (isBalanced) {
        ctx.shadowColor = "hsl(43, 72%, 52%)";
        ctx.shadowBlur = 15;
      }
      ctx.fillText(`${Math.round(claimedWeight)}g`, cx, cy - 20);
      ctx.shadowBlur = 0;

      ctx.font = "10px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.fillText(`/ ${totalWeight}g`, cx, cy - 6);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetAngle, totalWeight, claimedWeight, ratio, isBalanced]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="mx-auto" style={{ width: 280, height: 160 }} />
    </div>
  );
}
