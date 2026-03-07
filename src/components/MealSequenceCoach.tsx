import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { MealRecord } from "@/hooks/useMeals";
import { getSequenceGrade, getSequenceGradeInfo } from "@/lib/sequenceScore";

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

function computeOverallScore(meals: MealRecord[]): number {
  const scored = meals.filter(m => m.sequence_score != null);
  if (scored.length === 0) return 0;
  return Math.round(scored.reduce((s, m) => s + (m.sequence_score || 0), 0) / scored.length);
}

function generateTips(meals: MealRecord[], isZh: boolean): string[] {
  const tips: string[] = [];
  if (meals.length === 0) return tips;

  const last7 = meals.filter(m => Date.now() - new Date(m.recorded_at).getTime() < 7 * 86400000);

  const breakfasts = last7.filter(m => new Date(m.recorded_at).getHours() >= 5 && new Date(m.recorded_at).getHours() < 10);
  if (breakfasts.length < 3) {
    tips.push(isZh ? "🌅 本周早餐不足3次，建议每天7-8点进食，启动代谢引擎" : "🌅 Less than 3 breakfasts this week — try eating by 7-8 AM to kickstart metabolism");
  }

  const lateNight = last7.filter(m => new Date(m.recorded_at).getHours() >= 21);
  if (lateNight.length > 0) {
    tips.push(isZh ? "🌙 检测到夜间进食记录，21点后进食会增加脂肪存储风险" : "🌙 Late-night eating detected — eating after 9 PM increases fat storage risk");
  }

  // Sequence score trend tip
  const scored = last7.filter(m => m.sequence_score != null);
  if (scored.length >= 2) {
    const avgScore = scored.reduce((s, m) => s + (m.sequence_score || 0), 0) / scored.length;
    if (avgScore < 50) {
      tips.push(isZh ? "🔄 近期进食顺序评分偏低，记住：蔬菜→蛋白质→主食，血糖更稳定" : "🔄 Recent sequence scores are low — remember: Veggies → Protein → Carbs for stable blood sugar");
    } else if (avgScore >= 80) {
      tips.push(isZh ? "🏆 进食顺序表现优秀！身体资产持续增值，午后专注力+20%" : "🏆 Excellent eating order! Body assets appreciating, afternoon focus +20%");
    }
  }

  if (tips.length === 0) {
    tips.push(isZh ? "✨ 饮食时序表现良好！保持规律进食，身体资产持续增值" : "✨ Great meal timing! Keep it up — consistent timing maximizes body asset growth");
  }

  return tips.slice(0, 3);
}

export default function MealSequenceCoach({ meals }: Props) {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";

  const heatmap = useMemo(() => buildTimingHeatmap(meals), [meals]);
  const overallScore = useMemo(() => computeOverallScore(meals), [meals]);
  const tips = useMemo(() => generateTips(meals, isZh), [meals, isZh]);

  // Recent meals with sequence scores
  const scoredMeals = useMemo(() => {
    return meals
      .filter(m => m.sequence_score != null)
      .slice(0, 10);
  }, [meals]);

  const scoreColor = overallScore >= 75 ? "hsl(var(--success))" : overallScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const scoreLabel = overallScore >= 75
    ? (isZh ? "优秀" : "Excellent")
    : overallScore >= 50
      ? (isZh ? "良好" : "Good")
      : overallScore > 0
        ? (isZh ? "需改善" : "Needs Work")
        : (isZh ? "暂无数据" : "No Data");

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
                strokeDasharray={`${overallScore * 2.136} 999`}
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono" style={{ color: scoreColor }}>{overallScore}</span>
              <span className="text-[8px] font-mono text-muted-foreground tracking-wider">{scoreLabel}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-card-foreground mb-1">
              {isZh ? "进食顺序评分" : "Eating Order Score"}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {isZh
                ? "基于每餐食材顺序评估：蔬菜→蛋白质→主食为最优路径"
                : "Per-meal ingredient order: Veggies → Protein → Carbs is optimal"}
            </p>
          </div>
        </div>

        {/* Per-Meal Sequence Score History */}
        {scoredMeals.length > 0 && (
          <div>
            <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider mb-2">
              {isZh ? "近期顺序评分记录" : "RECENT SEQUENCE SCORES"}
            </p>
            {/* Sparkline bar chart */}
            <div className="flex items-end gap-1 h-16 mb-2">
              {scoredMeals.map((m, i) => {
                const s = m.sequence_score || 0;
                const grade = getSequenceGrade(s);
                const info = getSequenceGradeInfo(grade, isZh);
                return (
                  <div key={m.id} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                      className="w-full rounded-t-sm transition-all duration-500 min-h-[4px]"
                      style={{
                        height: `${Math.max(8, s * 0.6)}%`,
                        background: info.color,
                        opacity: 0.7 + (i === 0 ? 0.3 : 0),
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass-strong rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <p className="text-[8px] font-mono text-card-foreground">{m.food_name}</p>
                      <p className="text-[7px] font-mono" style={{ color: info.color }}>{info.icon} {s} · {info.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Meal list with scores */}
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {scoredMeals.slice(0, 5).map(m => {
                const s = m.sequence_score || 0;
                const grade = getSequenceGrade(s);
                const info = getSequenceGradeInfo(grade, isZh);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-border/20"
                    style={{ background: `${info.color}08` }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm">{info.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-card-foreground truncate">{m.food_name}</p>
                        <p className="text-[8px] font-mono text-muted-foreground/50">
                          {new Date(m.recorded_at).toLocaleDateString(isZh ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-12 h-1.5 rounded-full overflow-hidden bg-secondary/50">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s}%`, background: info.color }}
                        />
                      </div>
                      <span className="text-xs font-black font-mono tabular-nums" style={{ color: info.color }}>{s}</span>
                      <span className="text-[7px] font-mono text-muted-foreground/40">{info.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timing Heatmap */}
        <div>
          <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider mb-2">
            {isZh ? "7日进食热力图" : "7-DAY TIMING HEATMAP"}
          </p>
          <div className="grid grid-cols-8 gap-1">
            <div />
            {heatmap.map((day, i) => (
              <div key={i} className="text-center text-[8px] font-mono text-muted-foreground/60">
                {isZh ? day.label : ["S", "M", "T", "W", "T", "F", "S"][new Date(Date.now() - (6 - i) * 86400000).getDay()]}
              </div>
            ))}
            {slotLabels.map((slot, si) => (
              <div key={`row-${si}`} className="contents">
                <div className="text-[8px] font-mono text-muted-foreground/50 flex items-center justify-end pr-1">
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
              </div>
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
              >
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Meal Rhythm */}
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

  const startH = 6, endH = 22, range = endH - startH;

  return (
    <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: "hsl(var(--border) / 0.15)" }}>
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
      {todayMeals.map((m, i) => {
        const d = new Date(m.recorded_at);
        const hourPos = d.getHours() + d.getMinutes() / 60;
        const left = Math.max(0, Math.min(100, ((hourPos - startH) / range) * 100));
        const hasScore = m.sequence_score != null;
        const grade = hasScore ? getSequenceGrade(m.sequence_score!) : null;
        const info = grade ? getSequenceGradeInfo(grade, isZh) : null;
        return (
          <div
            key={m.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${left}%` }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2"
              style={{
                background: info ? `${info.color}20` : "hsl(var(--primary) / 0.15)",
                borderColor: info ? `${info.color}80` : "hsl(var(--primary) / 0.5)",
                boxShadow: `0 0 8px ${info ? `${info.color}40` : "hsl(var(--primary) / 0.3)"}`,
              }}
            >
              {hasScore ? <span className="text-[7px] font-mono font-bold">{m.sequence_score}</span> : i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
