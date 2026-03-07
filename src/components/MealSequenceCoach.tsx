import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { MealRecord } from "@/hooks/useMeals";

interface Props {
  meals: MealRecord[];
}

// Analyze meal timing distribution across 7 days
function buildTimingHeatmap(meals: MealRecord[]) {
  const now = new Date();
  const days: { label: string; slots: number[] }[] = [];

  for (let d = 6; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toDateString();
    const dayMeals = meals.filter(m => new Date(m.recorded_at).toDateString() === dateStr);

    // 4 time slots: breakfast(5-10), lunch(10-14), snack(14-17), dinner(17-22)
    const slots = [0, 0, 0, 0];
    dayMeals.forEach(m => {
      const h = new Date(m.recorded_at).getHours();
      if (h >= 5 && h < 10) slots[0]++;
      else if (h >= 10 && h < 14) slots[1]++;
      else if (h >= 14 && h < 17) slots[2]++;
      else slots[3]++;
    });

    days.push({
      label: ["日", "一", "二", "三", "四", "五", "六"][date.getDay()],
      slots,
    });
  }
  return days;
}

// Compute sequence compliance: how often user eats in ideal timing
function computeSequenceScore(meals: MealRecord[]): number {
  if (meals.length === 0) return 0;

  const last14 = meals.filter(m => {
    const diff = Date.now() - new Date(m.recorded_at).getTime();
    return diff < 14 * 86400000;
  });

  if (last14.length === 0) return 0;

  let goodCount = 0;
  // Group by day
  const dayMap = new Map<string, MealRecord[]>();
  last14.forEach(m => {
    const key = new Date(m.recorded_at).toDateString();
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(m);
  });

  dayMap.forEach(dayMeals => {
    const sorted = [...dayMeals].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    // Check: protein before carbs? veggies early?
    let hasEarlyProtein = false;
    let hasLateCarb = false;
    sorted.forEach((m, i) => {
      const ratio = i / Math.max(sorted.length - 1, 1);
      if (m.protein_g > m.carbs_g * 0.8 && ratio < 0.5) hasEarlyProtein = true;
      if (m.carbs_g > m.protein_g && ratio > 0.5) hasLateCarb = true;
    });
    if (hasEarlyProtein || hasLateCarb) goodCount++;
    // Regularity: meals at consistent times
    if (sorted.length >= 2) goodCount += 0.5;
  });

  return Math.min(100, Math.round((goodCount / Math.max(dayMap.size, 1)) * 80 + 20));
}

// Generate smart tips based on patterns
function generateTips(meals: MealRecord[], isZh: boolean): string[] {
  const tips: string[] = [];
  if (meals.length === 0) return tips;

  const last7 = meals.filter(m => Date.now() - new Date(m.recorded_at).getTime() < 7 * 86400000);

  // Check breakfast frequency
  const breakfasts = last7.filter(m => {
    const h = new Date(m.recorded_at).getHours();
    return h >= 5 && h < 10;
  });
  if (breakfasts.length < 3) {
    tips.push(isZh ? "🌅 本周早餐不足3次，建议每天7-8点进食，启动代谢引擎" : "🌅 Less than 3 breakfasts this week — try eating by 7-8 AM to kickstart metabolism");
  }

  // Check late-night eating
  const lateNight = last7.filter(m => new Date(m.recorded_at).getHours() >= 21);
  if (lateNight.length > 0) {
    tips.push(isZh ? "🌙 检测到夜间进食记录，21点后进食会增加脂肪存储风险" : "🌙 Late-night eating detected — eating after 9 PM increases fat storage risk");
  }

  // Check protein distribution
  const avgProtein = last7.reduce((s, m) => s + m.protein_g, 0) / Math.max(last7.length, 1);
  if (avgProtein < 15) {
    tips.push(isZh ? "💪 蛋白质摄入偏低，建议每餐保证20g+蛋白质以稳定血糖" : "💪 Low protein per meal — aim for 20g+ protein each meal to stabilize blood sugar");
  }

  // Meal spacing tip
  const dayMap = new Map<string, number[]>();
  last7.forEach(m => {
    const d = new Date(m.recorded_at);
    const key = d.toDateString();
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(d.getHours() * 60 + d.getMinutes());
  });

  let tooClose = 0;
  dayMap.forEach(times => {
    const sorted = times.sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] < 120) tooClose++;
    }
  });

  if (tooClose > 2) {
    tips.push(isZh ? "⏰ 部分餐食间隔不足2小时，建议间隔3-4小时让消化系统充分休息" : "⏰ Some meals are too close together — space meals 3-4 hours apart for proper digestion");
  }

  // Always add a positive tip if we have data
  if (tips.length === 0) {
    tips.push(isZh ? "✨ 饮食时序表现良好！保持规律进食，身体资产持续增值" : "✨ Great meal timing! Keep it up — consistent timing maximizes body asset growth");
  }

  return tips.slice(0, 3);
}

export default function MealSequenceCoach({ meals }: Props) {
  const { t, locale } = useI18n();
  const isZh = locale === "zh-CN";

  const heatmap = useMemo(() => buildTimingHeatmap(meals), [meals]);
  const score = useMemo(() => computeSequenceScore(meals), [meals]);
  const tips = useMemo(() => generateTips(meals, isZh), [meals, isZh]);

  const scoreColor = score >= 75 ? "hsl(var(--success))" : score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const scoreLabel = score >= 75
    ? (isZh ? "优秀" : "Excellent")
    : score >= 50
      ? (isZh ? "良好" : "Good")
      : (isZh ? "需改善" : "Needs Work");

  const slotLabels = isZh ? ["早", "午", "加", "晚"] : ["AM", "Noon", "Snk", "PM"];

  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {isZh ? "饮食时序教练 · SEQUENCE COACH" : "MEAL SEQUENCE COACH"}
      </h3>
      <div className="glass rounded-2xl p-5 shadow-card space-y-5">

        {/* Score Ring */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={scoreColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${score * 2.136} 999`}
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono" style={{ color: scoreColor }}>{score}</span>
              <span className="text-[8px] font-mono text-muted-foreground tracking-wider">{scoreLabel}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-card-foreground mb-1">
              {isZh ? "时序合规度" : "Timing Compliance"}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {isZh
                ? "基于近14天的进食时间、顺序和间隔综合评估"
                : "Based on 14-day analysis of meal timing, order, and spacing"}
            </p>
          </div>
        </div>

        {/* Timing Heatmap */}
        <div>
          <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider mb-2">
            {isZh ? "7日进食热力图" : "7-DAY TIMING HEATMAP"}
          </p>
          <div className="grid grid-cols-8 gap-1">
            {/* Header */}
            <div />
            {heatmap.map((day, i) => (
              <div key={i} className="text-center text-[8px] font-mono text-muted-foreground/60">
                {isZh ? day.label : ["S", "M", "T", "W", "T", "F", "S"][new Date(Date.now() - (6 - i) * 86400000).getDay()]}
              </div>
            ))}
            {/* Rows */}
            {slotLabels.map((slot, si) => (
              <>
                <div key={`label-${si}`} className="text-[8px] font-mono text-muted-foreground/50 flex items-center justify-end pr-1">
                  {slot}
                </div>
                {heatmap.map((day, di) => {
                  const v = day.slots[si];
                  const opacity = v === 0 ? 0.06 : Math.min(0.2 + v * 0.3, 1);
                  return (
                    <div
                      key={`${si}-${di}`}
                      className="aspect-square rounded-sm transition-all duration-300"
                      style={{
                        background: v > 0 ? `hsl(var(--success) / ${opacity})` : `hsl(var(--border) / 0.3)`,
                        boxShadow: v > 1 ? `0 0 8px hsl(var(--success) / 0.3)` : "none",
                      }}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Optimal Order Guide */}
        <div className="glass rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider">
            {isZh ? "黄金进食顺序" : "GOLDEN EATING ORDER"}
          </p>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {[
              { icon: "🥬", label: isZh ? "蔬菜/汤" : "Veggies", desc: isZh ? "建立减震带" : "Buffer zone", color: "hsl(var(--success))" },
              { icon: "→", label: "", desc: "", color: "" },
              { icon: "🥩", label: isZh ? "蛋白质" : "Protein", desc: isZh ? "修复原料" : "Repair fuel", color: "hsl(var(--info))" },
              { icon: "→", label: "", desc: "", color: "" },
              { icon: "🍚", label: isZh ? "主食" : "Carbs", desc: isZh ? "最后摄入" : "Eat last", color: "hsl(var(--warning))" },
            ].map((item, i) =>
              item.label ? (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[52px]">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: `${item.color}15`, boxShadow: `0 0 12px ${item.color}20` }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-semibold text-card-foreground">{item.label}</span>
                  <span className="text-[7px] text-muted-foreground">{item.desc}</span>
                </div>
              ) : (
                <span key={i} className="text-muted-foreground/30 text-xs font-mono">→</span>
              )
            )}
          </div>
        </div>

        {/* Smart Tips */}
        {tips.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider">
              {isZh ? "智能建议" : "SMART TIPS"}
            </p>
            {tips.map((tip, i) => (
              <div
                key={i}
                className="glass rounded-lg px-3 py-2.5 text-[10px] text-muted-foreground leading-relaxed border border-border/20"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Meal Interval Visualization */}
        {meals.length > 0 && (
          <div>
            <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider mb-2">
              {isZh ? "今日进食节奏" : "TODAY'S MEAL RHYTHM"}
            </p>
            <MealRhythmBar meals={meals} isZh={isZh} />
          </div>
        )}
      </div>
    </section>
  );
}

function MealRhythmBar({ meals, isZh }: { meals: MealRecord[]; isZh: boolean }) {
  const today = new Date().toDateString();
  const todayMeals = meals
    .filter(m => new Date(m.recorded_at).toDateString() === today)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  if (todayMeals.length === 0) {
    return (
      <p className="text-[9px] text-muted-foreground/40 font-mono text-center py-2">
        {isZh ? "今日暂无记录" : "No meals recorded today"}
      </p>
    );
  }

  // Timeline from 6:00 to 22:00 (16 hours)
  const startH = 6, endH = 22, range = endH - startH;

  return (
    <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: "hsl(var(--border) / 0.15)" }}>
      {/* Hour markers */}
      {[6, 9, 12, 15, 18, 21].map(h => (
        <div
          key={h}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${((h - startH) / range) * 100}%`, background: "hsl(var(--border) / 0.2)" }}
        >
          <span className="absolute -bottom-3.5 -translate-x-1/2 text-[7px] font-mono text-muted-foreground/30">
            {h}
          </span>
        </div>
      ))}
      {/* Meal dots */}
      {todayMeals.map((m, i) => {
        const d = new Date(m.recorded_at);
        const hourPos = d.getHours() + d.getMinutes() / 60;
        const left = Math.max(0, Math.min(100, ((hourPos - startH) / range) * 100));
        return (
          <div
            key={m.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${left}%` }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2"
              style={{
                background: "hsl(var(--primary) / 0.15)",
                borderColor: "hsl(var(--primary) / 0.5)",
                boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
              }}
            >
              {i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
