import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";
import MealScoreCard from "@/components/history/MealScoreCard";

type FilterMode = "all" | "week" | "month";

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 - offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function computeBpi(meal: { protein_g: number; carbs_g: number; fat_g: number }): number {
  const raw = 50 + meal.protein_g * 0.6 - meal.carbs_g * 0.15 - meal.fat_g * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

const History = () => {
  const navigate = useNavigate();
  const { meals, loading } = useMeals();
  const { profile } = useProfile();
  const { t, locale, setLocale } = useI18n();
  const isZh = locale === "zh-CN";

  const [filter, setFilter] = useState<FilterMode>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Filtered meals
  const { filteredMeals, rangeLabel } = useMemo(() => {
    if (filter === "all") return { filteredMeals: meals, rangeLabel: "" };

    const range = filter === "week" ? getWeekRange(weekOffset) : getMonthRange(monthOffset);
    const filtered = meals.filter(m => {
      const d = new Date(m.recorded_at);
      return d >= range.start && d <= range.end;
    });

    let label: string;
    if (filter === "week") {
      const s = range.start, e = range.end;
      label = isZh
        ? `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
        : `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      label = isZh
        ? `${range.start.getFullYear()}年${range.start.getMonth() + 1}月`
        : range.start.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }
    return { filteredMeals: filtered, rangeLabel: label };
  }, [meals, filter, weekOffset, monthOffset, isZh]);

  // Trend stats
  const trendStats = useMemo(() => {
    if (filteredMeals.length === 0) return null;

    const totalCal = filteredMeals.reduce((s, m) => s + m.calories, 0);
    const avgCal = Math.round(totalCal / filteredMeals.length);
    const totalProtein = filteredMeals.reduce((s, m) => s + m.protein_g, 0);
    const totalFat = filteredMeals.reduce((s, m) => s + m.fat_g, 0);
    const totalCarbs = filteredMeals.reduce((s, m) => s + m.carbs_g, 0);
    const avgProtein = Math.round(totalProtein / filteredMeals.length);
    const avgBpi = Math.round(filteredMeals.reduce((s, m) => s + computeBpi(m), 0) / filteredMeals.length);

    // Compare to previous period
    let prevAvgCal: number | null = null;
    let prevTotalProtein: number | null = null;
    let prevTotalFat: number | null = null;
    let prevTotalCarbs: number | null = null;
    if (filter !== "all") {
      const prevRange = filter === "week"
        ? getWeekRange((filter === "week" ? weekOffset : monthOffset) + 1)
        : getMonthRange(monthOffset + 1);
      const prevMeals = meals.filter(m => {
        const d = new Date(m.recorded_at);
        return d >= prevRange.start && d <= prevRange.end;
      });
      if (prevMeals.length > 0) {
        prevAvgCal = Math.round(prevMeals.reduce((s, m) => s + m.calories, 0) / prevMeals.length);
        prevTotalProtein = prevMeals.reduce((s, m) => s + m.protein_g, 0);
        prevTotalFat = prevMeals.reduce((s, m) => s + m.fat_g, 0);
        prevTotalCarbs = prevMeals.reduce((s, m) => s + m.carbs_g, 0);
      }
    }

    const calTrend = prevAvgCal !== null ? avgCal - prevAvgCal : 0;

    return { totalCal, avgCal, avgProtein, avgBpi, calTrend, mealCount: filteredMeals.length, totalProtein, totalFat, totalCarbs, prevTotalProtein, prevTotalFat, prevTotalCarbs };
  }, [filteredMeals, meals, filter, weekOffset, monthOffset]);

  // Group by date
  const grouped = useMemo(() => {
    return filteredMeals.reduce((acc, meal) => {
      const dateFmt = isZh
        ? new Date(meal.recorded_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })
        : new Date(meal.recorded_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
      if (!acc[dateFmt]) acc[dateFmt] = [];
      acc[dateFmt].push(meal);
      return acc;
    }, {} as Record<string, typeof meals>);
  }, [filteredMeals, isZh]);

  const offset = filter === "week" ? weekOffset : monthOffset;
  const setOffset = filter === "week" ? setWeekOffset : setMonthOffset;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-card-foreground">{t.navHistory}</h1>
          {meals.length > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tracking-wider">
              {meals.length} {isZh ? "条记录" : "records"}
            </p>
          )}
        </div>
        <button
          onClick={() => setLocale(isZh ? "en-US" : "zh-CN")}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass text-[10px] font-bold text-muted-foreground tracking-wider"
        >
          <Globe className="w-3 h-3" />
          {isZh ? "EN" : "中"}
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="px-5 mb-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary/50">
          {(["all", "week", "month"] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setFilter(mode);
                setWeekOffset(0);
                setMonthOffset(0);
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                filter === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {mode === "all" ? (isZh ? "全部" : "All")
                : mode === "week" ? (isZh ? "按周" : "Week")
                : (isZh ? "按月" : "Month")}
            </button>
          ))}
        </div>
      </div>

      {/* Period Navigation */}
      {filter !== "all" && (
        <div className="px-5 mb-3 flex items-center justify-between">
          <button
            onClick={() => setOffset(offset + 1)}
            className="px-3 py-1 rounded-lg glass text-[10px] font-mono font-bold text-muted-foreground active:scale-95 transition-transform"
          >
            ← {isZh ? "上一" : "Prev"}{filter === "week" ? (isZh ? "周" : "") : (isZh ? "月" : "")}
          </button>
          <span className="text-xs font-semibold text-card-foreground">{rangeLabel}</span>
          <button
            onClick={() => setOffset(Math.max(0, offset - 1))}
            disabled={offset === 0}
            className="px-3 py-1 rounded-lg glass text-[10px] font-mono font-bold text-muted-foreground disabled:opacity-30 active:scale-95 transition-transform"
          >
            {isZh ? "下一" : "Next"}{filter === "week" ? (isZh ? "周" : "") : (isZh ? "月" : "")} →
          </button>
        </div>
      )}

      {/* Trend Summary Card */}
      {trendStats && filter !== "all" && (
        <div className="px-5 mb-4">
          <div className="glass rounded-2xl p-4 shadow-card">
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: isZh ? "餐次" : "Meals",
                  value: trendStats.mealCount,
                  unit: "",
                },
                {
                  label: isZh ? "均卡" : "Avg Cal",
                  value: trendStats.avgCal,
                  unit: "kcal",
                  trend: trendStats.calTrend,
                },
                {
                  label: isZh ? "均蛋白" : "Avg P",
                  value: trendStats.avgProtein,
                  unit: "g",
                },
                {
                  label: isZh ? "均评分" : "Avg BPI",
                  value: trendStats.avgBpi,
                  unit: "",
                  isBpi: true,
                },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-[8px] font-mono text-muted-foreground/60 tracking-wider mb-1">{item.label}</p>
                  <p className="text-base font-black font-mono tabular-nums text-card-foreground leading-none">
                    {item.value}
                    {item.unit && <span className="text-[8px] font-normal text-muted-foreground ml-0.5">{item.unit}</span>}
                  </p>
                  {"trend" in item && item.trend !== undefined && item.trend !== 0 && (
                    <div className={`flex items-center justify-center gap-0.5 mt-1 text-[8px] font-mono ${
                      item.trend > 0 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
                    }`}>
                      {item.trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {item.trend > 0 ? "+" : ""}{item.trend}
                    </div>
                  )}
                  {"isBpi" in item && (
                    <div className="mt-1 mx-auto h-1 rounded-full overflow-hidden bg-secondary/50 w-10">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.value}%`,
                          background: item.value >= 75 ? "hsl(var(--success))" : item.value >= 50 ? "hsl(var(--primary))" : "hsl(var(--warning))",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Macro Distribution Pie */}
            <div className="mt-3 pt-3 border-t border-border/20">
              <p className="text-[8px] font-mono text-muted-foreground/50 tracking-wider mb-2">
                {isZh ? "营养素分布" : "MACRO DISTRIBUTION"}
              </p>
              <MacroPieChart
                protein={trendStats.totalProtein}
                fat={trendStats.totalFat}
                carbs={trendStats.totalCarbs}
                prevProtein={trendStats.prevTotalProtein}
                prevFat={trendStats.prevTotalFat}
                prevCarbs={trendStats.prevTotalCarbs}
                isZh={isZh}
              />
            </div>

            {/* Mini calorie chart */}
            {filteredMeals.length > 1 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <p className="text-[8px] font-mono text-muted-foreground/50 tracking-wider mb-2">
                  {isZh ? "热量趋势" : "CALORIE TREND"}
                </p>
                <MiniCalChart meals={filteredMeals} />
              </div>
            )}
          </div>
        </div>
      )}

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-2">
            <Camera className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{t.historyNoMealsYet}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> {t.takePhoto}
          </button>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Minus className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            {isZh ? "该时段暂无记录" : "No records in this period"}
          </p>
        </div>
      ) : (
        <div className="px-4 pb-6 space-y-5">
          {Object.entries(grouped).map(([date, dateMeals]) => {
            const dayCal = dateMeals.reduce((s, m) => s + m.calories, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">{date}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/60">
                    {t.historyDailySummary(dateMeals.length, dayCal)}
                  </p>
                </div>
                <div className="space-y-2">
                  {dateMeals.map(meal => (
                    <MealScoreCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Tiny sparkline of daily calories */
function MiniCalChart({ meals }: { meals: { calories: number; recorded_at: string }[] }) {
  // Group by day, get daily totals
  const dayMap = new Map<string, number>();
  meals.forEach(m => {
    const key = new Date(m.recorded_at).toLocaleDateString();
    dayMap.set(key, (dayMap.get(key) || 0) + m.calories);
  });

  const values = [...dayMap.values()];
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const barWidth = Math.min(24, Math.floor(280 / values.length));

  return (
    <div className="flex items-end gap-[2px] h-8 justify-center">
      {values.map((v, i) => {
        const h = Math.max(4, (v / max) * 100);
        const isHigh = v > max * 0.8;
        return (
          <div
            key={i}
            className="rounded-sm transition-all duration-500"
            style={{
              width: `${barWidth}px`,
              height: `${h}%`,
              background: isHigh ? "hsl(var(--warning) / 0.7)" : "hsl(var(--primary) / 0.5)",
            }}
          />
        );
      })}
    </div>
  );
}

/** SVG donut chart for macro distribution with period comparison */
function MacroPieChart({ protein, fat, carbs, prevProtein, prevFat, prevCarbs, isZh }: {
  protein: number; fat: number; carbs: number;
  prevProtein: number | null; prevFat: number | null; prevCarbs: number | null;
  isZh: boolean;
}) {
  const total = protein + fat + carbs || 1;
  const pPct = Math.round((protein / total) * 100);
  const fPct = Math.round((fat / total) * 100);
  const cPct = 100 - pPct - fPct;

  const r = 36, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  const pLen = (pPct / 100) * circumference;
  const fLen = (fPct / 100) * circumference;
  const cLen = (cPct / 100) * circumference;

  const segments = [
    { len: pLen, offset: 0, color: "hsl(var(--success))", label: isZh ? "蛋白" : "P", pct: pPct, grams: Math.round(protein), prev: prevProtein },
    { len: fLen, offset: pLen, color: "hsl(var(--warning))", label: isZh ? "脂肪" : "F", pct: fPct, grams: Math.round(fat), prev: prevFat },
    { len: cLen, offset: pLen + fLen, color: "hsl(var(--info))", label: isZh ? "碳水" : "C", pct: cPct, grams: Math.round(carbs), prev: prevCarbs },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth="8" />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${seg.len} ${circumference}`}
              strokeDashoffset={-seg.offset}
              className="transition-all duration-700"
              style={{ filter: `drop-shadow(0 0 4px ${seg.color})` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] font-mono font-bold text-card-foreground">{Math.round(total)}g</span>
          <span className="text-[7px] text-muted-foreground/50">{isZh ? "总计" : "total"}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {segments.map((seg, i) => {
          const diff = seg.prev !== null ? seg.grams - Math.round(seg.prev) : null;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-[9px] font-mono text-muted-foreground flex-1">{seg.label}</span>
              <span className="text-[10px] font-mono font-bold text-card-foreground tabular-nums">{seg.grams}g</span>
              <span className="text-[8px] font-mono text-muted-foreground/50 w-7 text-right">{seg.pct}%</span>
              {diff !== null && diff !== 0 && (
                <span className={`flex items-center text-[8px] font-mono w-10 justify-end ${
                  diff > 0 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
                }`}>
                  {diff > 0 ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                  {diff > 0 ? "+" : ""}{diff}
                </span>
              )}
              {diff !== null && diff === 0 && (
                <span className="flex items-center text-[8px] font-mono text-muted-foreground/40 w-10 justify-end">
                  <Minus className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default History;
