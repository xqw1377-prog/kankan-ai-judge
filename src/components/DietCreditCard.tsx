import { useState, useEffect, useRef } from "react";
import AnimatedScore from "./AnimatedScore";

interface DietCreditCardProps {
  score: number;
  level: string;
  levelDesc: string;
  beatText: string;
}

const DietCreditCard = ({ score, level, levelDesc, beatText }: DietCreditCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

  // Animated gold shimmer on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 360 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    let offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 360, 200);

      // Brushed metal base
      for (let y = 0; y < 200; y += 2) {
        const alpha = 0.02 + Math.random() * 0.015;
        ctx.fillStyle = `rgba(212,175,55,${alpha})`;
        ctx.fillRect(0, y, 360, 1);
      }

      // Flowing gold light streak
      const grad = ctx.createLinearGradient(offset - 120, 0, offset + 120, 200);
      grad.addColorStop(0, "rgba(212,175,55,0)");
      grad.addColorStop(0.4, "rgba(245,208,96,0.12)");
      grad.addColorStop(0.5, "rgba(245,208,96,0.2)");
      grad.addColorStop(0.6, "rgba(245,208,96,0.12)");
      grad.addColorStop(1, "rgba(212,175,55,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 360, 200);

      // Secondary subtle shimmer
      const grad2 = ctx.createLinearGradient(offset * 0.6 - 80, 100, offset * 0.6 + 80, 0);
      grad2.addColorStop(0, "rgba(212,175,55,0)");
      grad2.addColorStop(0.5, "rgba(255,255,255,0.04)");
      grad2.addColorStop(1, "rgba(212,175,55,0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, 360, 200);

      offset = (offset + 0.8) % 480;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft animate-slide-up" style={{ minHeight: 180 }}>
      {/* Dark base */}
      <div className="absolute inset-0 bg-[#0d0f14]" />

      {/* Canvas shimmer overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100%", height: "100%", mixBlendMode: "screen" }}
      />

      {/* Gold border glow */}
      <div className="absolute inset-0 rounded-2xl" style={{
        border: "1px solid rgba(212,175,55,0.25)",
        boxShadow: "inset 0 1px 0 rgba(212,175,55,0.1), 0 0 30px rgba(212,175,55,0.08)",
      }} />

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col justify-between" style={{ minHeight: 180 }}>
        {/* Top row: brand chip + level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F5D060)", color: "#0A0C10" }}>
              K
            </div>
            <span className="text-xs font-bold tracking-[3px] uppercase" style={{ color: "#D4AF37" }}>
              HEALTH INDEX
            </span>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}>
            {level}
          </span>
        </div>

        {/* Center: big score */}
        <div className="flex items-end gap-2 my-3">
          <AnimatedScore target={score} duration={2200} />
          <span className="text-xs font-semibold mb-1.5" style={{ color: "rgba(212,175,55,0.6)" }}>pts</span>
        </div>

        {/* Bottom: value copy */}
        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(160,174,192,0.6)" }}>
          {beatText}
        </p>
      </div>
    </div>
  );
};

export default DietCreditCard;
