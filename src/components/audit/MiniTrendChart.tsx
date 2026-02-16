import { useMemo } from "react";
import { TrendingUp, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";

const computeBpi = (meal: { protein_g: number; fat_g: number; carbs_g: number }) => {
  const raw = 50 + meal.protein_g * 0.6 - meal.carbs_g * 0.15 - meal.fat_g * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

interface GoalRing {
  label: string;
  pct: number;
  color: string;
}

const MiniTrendChart = () => {
  const { t } = useI18n();
  const { meals, todayMeals, loading } = useMeals();
  const { profile } = useProfile();
  const isZh = t.cancel === "取消";

  const dailyData = useMemo(() => {
    const now = new Date();
    const days: { label: string; rate: number; bpi: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toDateString();
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayMeals = meals.filter((m) => new Date(m.recorded_at).toDateString() === dateStr);
      if (dayMeals.length === 0) {
        days.push({ label: dayLabel, rate: 0, bpi: 0 });
        continue;
      }
      const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
      const targetCal = (profile as any)?.target_calories || 2000;
      const ratio = totalCal / targetCal;
      const rate = Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : Math.max(0, 200 - ratio * 100))));
      const avgBpi = Math.round(dayMeals.reduce((s, m) => s + computeBpi(m), 0) / dayMeals.length);
      days.push({ label: dayLabel, rate, bpi: avgBpi });
    }
    return days;
  }, [meals, profile]);

  // Today's goal achievement rings
  const goalRings = useMemo<GoalRing[]>(() => {
    const p = profile as any;
    if (!p) return [];
    const totalPro = todayMeals.reduce((s, m) => s + m.protein_g, 0);
    const totalFat = todayMeals.reduce((s, m) => s + m.fat_g, 0);
    const totalCarbs = todayMeals.reduce((s, m) => s + m.carbs_g, 0);
    const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);

    return [
      { label: isZh ? "热量" : "Cal", pct: Math.min(100, Math.round((totalCal / (p.target_calories || 2000)) * 100)), color: "hsl(var(--primary))" },
      { label: isZh ? "蛋白" : "Pro", pct: Math.min(100, Math.round((totalPro / (p.target_protein_g || 100)) * 100)), color: "hsl(160 60% 45%)" },
      { label: isZh ? "脂肪" : "Fat", pct: Math.min(100, Math.round((totalFat / (p.target_fat_g || 60)) * 100)), color: "hsl(var(--warning))" },
      { label: isZh ? "碳水" : "Carb", pct: Math.min(100, Math.round((totalCarbs / (p.target_carbs_g || 200)) * 100)), color: "hsl(var(--info))" },
    ];
  }, [todayMeals, profile, isZh]);

  if (loading) return null;
  const hasData = dailyData.some((d) => d.rate > 0);

  // SVG sparkline
  const width = 200;
  const height = 48;
  const padding = 4;
  const maxRate = Math.max(...dailyData.map((d) => d.rate), 1);
  const points = dailyData.map((d, i) => ({
    x: padding + (i / 6) * (width - padding * 2),
    y: height - padding - ((d.rate / maxRate) * (height - padding * 2)),
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  // Mini ring SVG helper
  const Ring = ({ pct, color, size = 32 }: { pct: number; color: string; size?: number }) => {
    const r = (size - 4) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220 15% 14%)" strokeWidth="3" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
    );
  };

  return (
    <div className="glass rounded-xl p-3 space-y-3 animate-fade-in">
      {/* Today's Goal Achievement Rings */}
      {goalRings.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
              {t.auditGoalAchievement}
            </span>
          </div>
          <div className="flex justify-around">
            {goalRings.map((ring, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <Ring pct={ring.pct} color={ring.color} />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-card-foreground">
                    {ring.pct}%
                  </span>
                </div>
                <span className="text-[8px] font-mono text-muted-foreground/60">{ring.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day trend sparkline */}
      {hasData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
                {t.auditTrendTitle}
              </span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground/50">7D</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-fill-v2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#trend-fill-v2)" />
            <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) =>
              dailyData[i].rate > 0 ? (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              ) : null
            )}
          </svg>
          <div className="flex justify-between px-1">
            {dailyData.map((d, i) => (
              <span key={i} className="text-[8px] font-mono text-muted-foreground/40">{d.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniTrendChart;
