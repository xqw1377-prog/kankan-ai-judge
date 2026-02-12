import { useEffect, useRef, useCallback } from "react";
import { useMeals, MealRecord } from "@/hooks/useMeals";

interface DietRingProps {
  meals: MealRecord[];
}

function getDayColor(dayMeals: MealRecord[]): string {
  if (dayMeals.length === 0) return "hsl(0 0% 85%)";
  const avgCal = dayMeals.reduce((s, m) => s + m.calories, 0);
  const avgPro = dayMeals.reduce((s, m) => s + m.protein_g, 0);
  const avgFat = dayMeals.reduce((s, m) => s + m.fat_g, 0);
  // Green = balanced, Red = high fat/cal, Yellow = high carb
  if (avgFat > avgPro * 1.5 || avgCal > 2500) return "hsl(0 70% 55%)";
  if (avgPro >= avgFat) return "hsl(122 45% 50%)";
  return "hsl(45 90% 55%)";
}

const DietRing = ({ meals }: DietRingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    // Get last 7 days
    const days: MealRecord[][] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      days.push(meals.filter(m => new Date(m.recorded_at).toDateString() === ds));
    }

    // Draw ring of dots
    const ringRadius = 70;
    const dotRadius = 14;
    const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

    days.forEach((dayMeals, i) => {
      const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * ringRadius;
      const y = cy + Math.sin(angle) * ringRadius;

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = getDayColor(dayMeals);
      ctx.fill();

      // Meal count
      if (dayMeals.length > 0) {
        ctx.fillStyle = "white";
        ctx.font = `bold ${11}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(dayMeals.length), x, y);
      }

      // Day label
      const labelR = ringRadius + dotRadius + 10;
      const lx = cx + Math.cos(angle) * labelR;
      const ly = cy + Math.sin(angle) * labelR;
      ctx.fillStyle = "#8a9e8a";
      ctx.font = `500 ${9}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dayLabels[i], lx, ly);
    });

    // Center text
    ctx.fillStyle = "#2a3e2a";
    ctx.font = `bold ${12}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("饮食年轮", cx, cy - 6);
    ctx.fillStyle = "#8a9e8a";
    ctx.font = `500 ${9}px sans-serif`;
    ctx.fillText("近 7 天", cx, cy + 8);
  }, [meals]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="mb-2" />
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> 均衡</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> 偏碳水</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> 偏油脂</span>
      </div>
    </div>
  );
};

export default DietRing;
