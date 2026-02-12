import { useEffect, useRef, useCallback, useState } from "react";
import { MealRecord } from "@/hooks/useMeals";

interface DietRingProps {
  meals: MealRecord[];
}

interface DayData {
  meals: MealRecord[];
  totalCal: number;
  proteinRatio: number;
  fatRatio: number;
  carbRatio: number;
  date: Date;
}

function getDayData(dayMeals: MealRecord[], date: Date): DayData {
  const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
  const totalPro = dayMeals.reduce((s, m) => s + m.protein_g, 0);
  const totalFat = dayMeals.reduce((s, m) => s + m.fat_g, 0);
  const totalCarb = dayMeals.reduce((s, m) => s + m.carbs_g, 0);
  const totalMacro = totalPro + totalFat + totalCarb || 1;
  return {
    meals: dayMeals,
    totalCal,
    proteinRatio: totalPro / totalMacro,
    fatRatio: totalFat / totalMacro,
    carbRatio: totalCarb / totalMacro,
    date,
  };
}

const DietRing = ({ meals }: DietRingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: DayData } | null>(null);
  const daysRef = useRef<DayData[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 260;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    // Get last 7 days
    const days: DayData[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const dayMeals = meals.filter(m => new Date(m.recorded_at).toDateString() === ds);
      days.push(getDayData(dayMeals, d));
    }
    daysRef.current = days;

    const maxCal = Math.max(2500, ...days.map(d => d.totalCal));

    // Draw connecting arcs (subtle)
    const ringRadius = 80;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 24;
    ctx.stroke();

    // Draw segments for each day (arc segments with macro colors)
    const segmentAngle = (Math.PI * 2) / 7;
    const gap = 0.06; // radians gap between segments

    days.forEach((day, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2 + gap / 2;
      const endAngle = (i + 1) * segmentAngle - Math.PI / 2 - gap / 2;
      const calIntensity = day.totalCal > 0 ? Math.min(day.totalCal / maxCal, 1) : 0.1;
      const lineWidth = 8 + calIntensity * 18;

      if (day.meals.length === 0) {
        // Empty day - dashed ring
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, startAngle, endAngle);
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Draw tri-color arc (protein → fat → carb)
        const totalArc = endAngle - startAngle;
        const proArc = startAngle + totalArc * day.proteinRatio;
        const fatArc = proArc + totalArc * day.fatRatio;

        // Protein segment (blue-green)
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, startAngle, proArc);
        ctx.strokeStyle = `hsla(160, 60%, 45%, ${0.4 + calIntensity * 0.6})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "butt";
        ctx.stroke();

        // Fat segment (orange)
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, proArc, fatArc);
        ctx.strokeStyle = `hsla(30, 90%, 55%, ${0.4 + calIntensity * 0.6})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Carb segment (purple)
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, fatArc, endAngle);
        ctx.strokeStyle = `hsla(280, 50%, 55%, ${0.4 + calIntensity * 0.6})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      // Day label
      const labelAngle = (startAngle + endAngle) / 2;
      const labelR = ringRadius + 22;
      const lx = cx + Math.cos(labelAngle) * labelR;
      const ly = cy + Math.sin(labelAngle) * labelR;
      const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];
      ctx.fillStyle = day.meals.length > 0 ? "#4a6a4a" : "#b0c0b0";
      ctx.font = `${day.meals.length > 0 ? "bold" : "500"} 10px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dayLabels[i], lx, ly);

      // Calorie number on ring
      if (day.totalCal > 0) {
        const numR = ringRadius;
        const nx = cx + Math.cos(labelAngle) * numR;
        const ny = cy + Math.sin(labelAngle) * numR;
        ctx.fillStyle = "white";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(day.totalCal), nx, ny);
      }
    });

    // Center text
    ctx.fillStyle = "#2a3e2a";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("饮食年轮", cx, cy - 10);
    ctx.fillStyle = "#8a9e8a";
    ctx.font = "500 10px sans-serif";
    ctx.fillText("近 7 天", cx, cy + 6);

    // Total calories below
    const weekCal = days.reduce((s, d) => s + d.totalCal, 0);
    ctx.fillStyle = "#4CAF50";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${weekCal} kcal`, cx, cy + 22);
  }, [meals]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Long press handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    longPressTimer.current = setTimeout(() => {
      const cx = 130, cy = 130, ringR = 80;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > ringR - 20 && dist < ringR + 20) {
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;
        const idx = Math.floor((angle / (Math.PI * 2)) * 7);
        const day = daysRef.current[Math.min(idx, 6)];
        if (day && day.meals.length > 0) {
          setTooltip({ x, y: y - 60, day });
        }
      }
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setTimeout(() => setTooltip(null), 2000);
  }, []);

  return (
    <div className="flex flex-col items-center relative">
      <canvas
        ref={canvasRef}
        className="mb-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* Long-press tooltip */}
      {tooltip && (
        <div
          className="absolute bg-card rounded-xl shadow-soft p-3 z-20 animate-scale-in border border-border"
          style={{ left: Math.max(10, Math.min(tooltip.x - 80, 100)), top: Math.max(0, tooltip.y), width: 180 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold">
              {tooltip.day.date.getMonth() + 1}月{tooltip.day.date.getDate()}日
            </p>
            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {tooltip.day.meals.length}餐
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-black text-primary">{tooltip.day.totalCal}</span>
            <span className="text-[10px] text-muted-foreground">kcal</span>
          </div>
          {/* Macro breakdown mini bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
            <div style={{ width: `${tooltip.day.proteinRatio * 100}%`, background: "hsl(160 60% 45%)" }} />
            <div style={{ width: `${tooltip.day.fatRatio * 100}%`, background: "hsl(30 90% 55%)" }} />
            <div style={{ width: `${tooltip.day.carbRatio * 100}%`, background: "hsl(280 50% 55%)" }} />
          </div>
          {/* Meal food names */}
          <div className="flex flex-wrap gap-1">
            {tooltip.day.meals.slice(0, 4).map((m, i) => (
              <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold truncate max-w-[80px]">
                🍽 {m.food_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "hsl(160 60% 45%)" }} /> 蛋白
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "hsl(30 90% 55%)" }} /> 脂肪
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "hsl(280 50% 55%)" }} /> 碳水
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-3 inline-block border border-border rounded-sm" /> 厚=高热量
        </span>
      </div>
    </div>
  );
};

export default DietRing;
