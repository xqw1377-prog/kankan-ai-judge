import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";

const computeBpi = (meal: { protein_g: number; fat_g: number; carbs_g: number }) => {
  const raw = 50 + meal.protein_g * 0.6 - meal.carbs_g * 0.15 - meal.fat_g * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

const MiniTrendChart = () => {
  const { t } = useI18n();
  const { meals, loading } = useMeals();
  const { profile } = useProfile();

  const dailyData = useMemo(() => {
    const now = new Date();
    const days: { label: string; rate: number; bpi: number }[] = [];

    for (let d = 6; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toDateString();
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

      const dayMeals = meals.filter(
        (m) => new Date(m.recorded_at).toDateString() === dateStr
      );

      if (dayMeals.length === 0) {
        days.push({ label: dayLabel, rate: 0, bpi: 0 });
        continue;
      }

      const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
      const targetCal = (profile as any)?.target_calories || 2000;
      // Goal achievement rate: closer to target = higher rate, penalize overshoot
      const ratio = totalCal / targetCal;
      const rate = Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : Math.max(0, 200 - ratio * 100))));
      const avgBpi = Math.round(dayMeals.reduce((s, m) => s + computeBpi(m), 0) / dayMeals.length);

      days.push({ label: dayLabel, rate, bpi: avgBpi });
    }

    return days;
  }, [meals, profile]);

  if (loading) return null;

  const hasData = dailyData.some((d) => d.rate > 0);
  if (!hasData) return null;

  // SVG sparkline
  const width = 200;
  const height = 48;
  const padding = 4;
  const maxRate = Math.max(...dailyData.map((d) => d.rate), 1);
  const points = dailyData.map((d, i) => {
    const x = padding + (i / 6) * (width - padding * 2);
    const y = height - padding - ((d.rate / maxRate) * (height - padding * 2));
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="glass rounded-xl p-3 space-y-2 animate-fade-in">
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
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trend-fill)" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) =>
          dailyData[i].rate > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="hsl(var(--primary))" />
          ) : null
        )}
      </svg>

      <div className="flex justify-between px-1">
        {dailyData.map((d, i) => (
          <span key={i} className="text-[8px] font-mono text-muted-foreground/40">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export default MiniTrendChart;
