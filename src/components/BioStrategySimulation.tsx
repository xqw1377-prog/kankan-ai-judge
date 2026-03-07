import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DishInfo {
  name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  cookMethod?: string;
}

interface TodayMeal {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  recorded_at?: string;
}

type DigestDifficulty = "easy" | "moderate" | "hard";
export type SequenceQuality = "optimal" | "moderate" | "poor";

// ── Digestibility Engine ───────────────────────────────────────────────────────
// Score 1-10: 10 = easiest to digest, 1 = hardest
// Based on: fat content, protein density, cooking method, food type keywords

function calcDigestScore(dish: DishInfo): number {
  const total = dish.calories || 1;
  const fatRatio = (dish.fat_g * 9) / total;
  const proteinRatio = (dish.protein_g * 4) / total;
  const carbRatio = (dish.carbs_g * 4) / total;
  const name = dish.name.toLowerCase();

  let score = 6; // baseline

  // Food type bonuses/penalties
  if (/汤|粥|soup|congee|broth|羹/.test(name)) score += 3;
  if (/沙拉|salad|凉拌/.test(name)) score += 2;
  if (/菜|蔬|vegetable|greens|青/.test(name)) score += 2;
  if (/蒸|steam/.test(name)) score += 1;
  if (/炸|fried|煎|炒|烤|grill|bbq|烧烤/.test(name)) score -= 2;
  if (/红烧|braised|卤|焖/.test(name)) score -= 1.5;
  if (/火锅|hotpot/.test(name)) score -= 1;
  if (/奶油|cream|芝士|cheese|披萨|pizza/.test(name)) score -= 2;
  if (/肥|五花|排骨|rib|猪蹄/.test(name)) score -= 2;

  // Cook method adjustment
  if (dish.cookMethod === "deepfry") score -= 2;
  if (dish.cookMethod === "braised") score -= 1;
  if (dish.cookMethod === "steam") score += 1;

  // Macro-based adjustments
  if (fatRatio > 0.5) score -= 2;
  else if (fatRatio > 0.35) score -= 1;
  if (proteinRatio > 0.5) score -= 0.5; // heavy protein slows digestion
  if (carbRatio > 0.7 && fatRatio < 0.15) score += 1; // plain carbs digest ok

  // Calorie load
  if (dish.calories > 800) score -= 1;
  if (dish.calories < 200) score += 1;

  return Math.max(1, Math.min(10, Math.round(score)));
}

function getDifficulty(score: number): DigestDifficulty {
  if (score >= 7) return "easy";
  if (score >= 4) return "moderate";
  return "hard";
}

function getStomachTime(score: number): number {
  // Minutes the food stays in stomach. Easy=30-60min, Hard=120-240min
  return Math.round(240 - (score - 1) * 23); // score 1→240min, score 10→33min
}

// ── Digestion Timeline Data ────────────────────────────────────────────────────

interface TimelinePoint {
  time: string;
  minutes: number;
  stomach: number;   // % remaining in stomach
  absorbed: number;  // % absorbed
  toxinRisk: number; // 0-100 risk of fermentation/toxin
  energy: number;    // energy availability
}

function generateTimeline(score: number, calories: number): TimelinePoint[] {
  const stomachEmpty = getStomachTime(score);
  const pts: TimelinePoint[] = [];

  for (let i = 0; i <= 48; i++) {
    const t = i / 48; // 0-1 over 4 hours
    const minutes = Math.round(t * 240);
    const hr = Math.floor(minutes / 60);
    const min = minutes % 60;
    const time = `${hr}:${min.toString().padStart(2, "0")}`;

    // Stomach emptying (exponential decay)
    const emptyRate = 3.5 / (stomachEmpty / 60); // faster for easy foods
    const stomach = Math.max(0, 100 * Math.exp(-emptyRate * t));

    // Absorption lags stomach emptying
    const absorbDelay = score >= 7 ? 0.08 : score >= 4 ? 0.15 : 0.25;
    const absorbed = Math.min(100, 100 * (1 - Math.exp(-emptyRate * Math.max(0, t - absorbDelay))));

    // Toxin/fermentation risk: high when food sits in stomach too long
    let toxinRisk = 0;
    if (score <= 4) {
      // Hard to digest → toxin risk rises after 60 min if stomach still >50%
      const stagnation = Math.max(0, stomach - 30) / 70;
      const timeWeight = Math.max(0, (minutes - 60) / 120);
      toxinRisk = Math.min(100, Math.round(stagnation * timeWeight * 100));
    } else if (score <= 6) {
      const stagnation = Math.max(0, stomach - 40) / 60;
      const timeWeight = Math.max(0, (minutes - 90) / 150);
      toxinRisk = Math.min(60, Math.round(stagnation * timeWeight * 60));
    }

    // Energy availability curve
    const energyPeak = score >= 7 ? 0.3 : score >= 4 ? 0.45 : 0.6;
    const energyWidth = score >= 7 ? 0.15 : score >= 4 ? 0.2 : 0.25;
    const energyBase = 20;
    const energyMax = Math.min(95, 40 + calories * 0.04);
    const energy = energyBase + (energyMax - energyBase) * Math.exp(-((t - energyPeak) ** 2) / (2 * energyWidth ** 2));

    pts.push({
      time, minutes,
      stomach: Math.round(stomach),
      absorbed: Math.round(absorbed),
      toxinRisk: Math.round(toxinRisk),
      energy: Math.round(energy),
    });
  }
  return pts;
}

// ── Multi-dish ordering ────────────────────────────────────────────────────────

interface OrderedDish {
  name: string;
  score: number;
  difficulty: DigestDifficulty;
  stomachMin: number;
  icon: string;
  isCurrent?: boolean;
}

function getDishIcon(name: string): string {
  const l = name.toLowerCase();
  if (/汤|soup|broth|羹/.test(l)) return "🍲";
  if (/粥|congee/.test(l)) return "🥣";
  if (/沙拉|salad/.test(l)) return "🥗";
  if (/菜|蔬|vegetable|greens/.test(l)) return "🥬";
  if (/鸡|chicken/.test(l)) return "🍗";
  if (/鱼|fish/.test(l)) return "🐟";
  if (/虾|shrimp/.test(l)) return "🦐";
  if (/牛|beef/.test(l)) return "🥩";
  if (/猪|pork|排骨|rib/.test(l)) return "🍖";
  if (/面|noodle|pasta/.test(l)) return "🍜";
  if (/饭|rice/.test(l)) return "🍚";
  if (/蛋|egg/.test(l)) return "🥚";
  if (/炸|fried/.test(l)) return "🍳";
  if (/火锅|hotpot/.test(l)) return "♨️";
  return "🍽";
}

const DIFFICULTY_COLORS: Record<DigestDifficulty, { text: string; bg: string; border: string; glow: string }> = {
  easy:     { text: "hsl(160, 70%, 40%)", bg: "rgba(57,200,100,0.08)", border: "rgba(57,200,100,0.25)", glow: "rgba(57,200,100,0.15)" },
  moderate: { text: "hsl(43, 80%, 48%)",  bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.25)", glow: "rgba(212,175,55,0.15)" },
  hard:     { text: "hsl(0, 72%, 52%)",   bg: "rgba(255,50,50,0.08)", border: "rgba(255,50,50,0.25)",  glow: "rgba(255,50,50,0.15)" },
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  dish: DishInfo;
  todayMeals?: TodayMeal[];
  visible: boolean;
  onSequenceQualityChange?: (quality: SequenceQuality) => void;
}

export default function BioStrategySimulation({ dish, todayMeals = [], visible, onSequenceQualityChange }: Props) {
  const { t } = useI18n();
  const [entered, setEntered] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const timer = setTimeout(() => setEntered(true), 200);
    return () => clearTimeout(timer);
  }, [visible]);

  // Current dish analysis
  const digestScore = useMemo(() => calcDigestScore(dish), [dish]);
  const difficulty = getDifficulty(digestScore);
  const stomachMin = getStomachTime(digestScore);
  const timeline = useMemo(() => generateTimeline(digestScore, dish.calories), [digestScore, dish.calories]);
  const maxToxin = useMemo(() => Math.max(...timeline.map(p => p.toxinRisk)), [timeline]);
  const colors = DIFFICULTY_COLORS[difficulty];

  // Multi-dish ordering (current + today's meals)
  const orderedDishes = useMemo((): OrderedDish[] => {
    const allDishes: OrderedDish[] = [];

    // Add today's meals
    todayMeals.forEach(m => {
      const s = calcDigestScore({
        name: m.food_name,
        calories: m.calories,
        protein_g: m.protein_g,
        fat_g: m.fat_g,
        carbs_g: m.carbs_g,
      });
      allDishes.push({
        name: m.food_name,
        score: s,
        difficulty: getDifficulty(s),
        stomachMin: getStomachTime(s),
        icon: getDishIcon(m.food_name),
        isCurrent: false,
      });
    });

    // Add current dish
    allDishes.push({
      name: dish.name,
      score: digestScore,
      difficulty,
      stomachMin,
      icon: getDishIcon(dish.name),
      isCurrent: true,
    });

    // Sort by digestibility: easiest first
    return allDishes.sort((a, b) => b.score - a.score);
  }, [todayMeals, dish, digestScore, difficulty, stomachMin]);

  const hasMultipleDishes = orderedDishes.length > 1;

  // Sequence quality based on whether current dish is in right order
  const sequenceQuality = useMemo((): SequenceQuality => {
    if (!hasMultipleDishes) {
      return difficulty === "hard" ? "moderate" : "optimal";
    }
    // Check if dishes are naturally ordered by digestibility
    const currentIdx = orderedDishes.findIndex(d => d.isCurrent);
    const idealIdx = [...orderedDishes].sort((a, b) => b.score - a.score).findIndex(d => d.isCurrent);
    if (currentIdx === idealIdx) return "optimal";
    if (Math.abs(currentIdx - idealIdx) <= 1) return "moderate";
    return "poor";
  }, [orderedDishes, hasMultipleDishes, difficulty]);

  useEffect(() => {
    onSequenceQualityChange?.(sequenceQuality);
  }, [sequenceQuality, onSequenceQualityChange]);

  if (!visible) return null;

  const diffLabel = difficulty === "easy" ? t.digestEasy : difficulty === "moderate" ? t.digestModerate : t.digestHard;
  const diffDesc = difficulty === "easy" ? t.digestEasyDesc : difficulty === "moderate" ? t.digestModerateDesc : t.digestHardDesc;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.bioStrategyTitle} <span className="flex-1 h-px bg-border" />
      </h3>

      <div className={`glass rounded-2xl p-4 shadow-card relative overflow-hidden transition-all duration-500 ${
        difficulty === "hard" ? "ring-1 ring-destructive/30" : ""
      }`}>
        {/* Difficulty pulse for hard foods */}
        {difficulty === "hard" && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl animate-pulse"
            style={{ background: "radial-gradient(ellipse at center, hsl(0 72% 55% / 0.06) 0%, transparent 70%)" }}
          />
        )}

        {/* ─── Dish Digest Card ─── */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-all"
            style={{
              background: colors.bg,
              border: `1.5px solid ${colors.border}`,
              boxShadow: `0 4px 16px ${colors.glow}`,
            }}
          >
            {getDishIcon(dish.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-card-foreground truncate">{dish.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              >
                {diffLabel}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {t.digestScoreLabel}: {digestScore}/10
              </span>
            </div>
          </div>
          {/* Stomach time */}
          <div className="text-center shrink-0">
            <p className="text-lg font-black font-mono" style={{ color: colors.text }}>{stomachMin}</p>
            <p className="text-[7px] font-mono text-muted-foreground/60">{t.digestMinUnit}</p>
          </div>
        </div>

        {/* Digest description */}
        <p className="text-[10px] leading-relaxed text-muted-foreground mb-3">
          🎯 {diffDesc}
        </p>

        {/* ─── Digestion Pipeline ─── */}
        <div className="flex items-center gap-1 mb-4">
          {["🍴", "→", "胃", "→", "小肠", "→", "✅"].map((label, i) => {
            const isOrgan = label === "胃" || label === "小肠";
            const isArrow = label === "→";
            const stageProgress = i <= 2 ? 100 - timeline[Math.min(24, Math.round(i * 8))].stomach :
              i <= 4 ? timeline[Math.min(36, Math.round(i * 6))].absorbed : 100;

            if (isArrow) {
              return (
                <div key={i} className="text-[8px] text-muted-foreground/30 font-mono">→</div>
              );
            }

            return (
              <div key={i} className="flex-1 relative">
                <div className="h-6 rounded-lg overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                  <div
                    className="h-full rounded-lg transition-all duration-1000"
                    style={{
                      width: entered ? `${Math.min(100, stageProgress)}%` : "0%",
                      background: `linear-gradient(90deg, ${colors.text}33, ${colors.text}66)`,
                      transitionDelay: `${i * 200}ms`,
                    }}
                  />
                </div>
                <p className="text-[7px] font-mono text-center mt-0.5 text-muted-foreground/50">
                  {isOrgan ? label : label === "🍴" ? t.digestStageIntake : label === "✅" ? t.digestStageAbsorb : label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Toxin warning */}
        {maxToxin > 30 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 mb-3 animate-fade-in">
            <p className="text-[10px] font-bold text-destructive flex items-center gap-1">
              ⚠️ {t.digestToxinWarning}
            </p>
            <p className="text-[8px] text-muted-foreground mt-0.5">
              {t.digestToxinDesc(stomachMin)}
            </p>
          </div>
        )}

        {/* ─── Timeline Chart (expandable) ─── */}
        <button
          onClick={() => setShowTimeline(v => !v)}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2 border border-border/30 hover:border-border/50 transition-all mb-2"
        >
          <span className="text-[10px] font-semibold text-muted-foreground">{t.digestTimelineTitle}</span>
          <span className="text-[9px] text-muted-foreground/50">{showTimeline ? "▲" : "▼"}</span>
        </button>

        {showTimeline && (
          <div className="animate-fade-in mb-3">
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stomachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.text} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.text} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="absorbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 70%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 70%, 45%)" stopOpacity={0.02} />
                    </linearGradient>
                    {maxToxin > 20 && (
                      <linearGradient id="toxinGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.02} />
                      </linearGradient>
                    )}
                  </defs>
                  <XAxis
                    dataKey="time" axisLine={false} tickLine={false}
                    tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))", opacity: 0.4 }}
                    interval={11}
                  />
                  <YAxis
                    domain={[0, 100]} axisLine={false} tickLine={false}
                    tick={{ fontSize: 7, fill: "hsl(var(--muted-foreground))", opacity: 0.3 }}
                    tickCount={3}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                      borderRadius: 8, fontSize: 10, padding: "6px 10px",
                    }}
                    formatter={(val: number, name: string) => {
                      const labels: Record<string, string> = {
                        stomach: t.digestChartStomach,
                        absorbed: t.digestChartAbsorbed,
                        toxinRisk: t.digestChartToxin,
                      };
                      return [`${val}%`, labels[name] || name];
                    }}
                  />
                  <Area type="monotone" dataKey="stomach" stroke={colors.text} fill="url(#stomachGrad)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="absorbed" stroke="hsl(160, 70%, 45%)" fill="url(#absorbGrad)" strokeWidth={1.5} dot={false} />
                  {maxToxin > 20 && (
                    <Area type="monotone" dataKey="toxinRisk" stroke="hsl(0, 72%, 55%)" fill="url(#toxinGrad)" strokeWidth={1} dot={false} strokeDasharray="3 2" />
                  )}
                  <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-1">
              {[
                { color: colors.text, label: t.digestChartStomach },
                { color: "hsl(160, 70%, 45%)", label: t.digestChartAbsorbed },
                ...(maxToxin > 20 ? [{ color: "hsl(0, 72%, 55%)", label: t.digestChartToxin }] : []),
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[7px] font-mono text-muted-foreground/50">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Multi-Dish Eating Order ─── */}
        {hasMultipleDishes && (
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              🍽 {t.digestOrderTitle}
            </p>
            <div className="space-y-1.5">
              {orderedDishes.map((d, i) => {
                const dc = DIFFICULTY_COLORS[d.difficulty];
                return (
                  <div
                    key={`${d.name}-${i}`}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                      d.isCurrent ? "ring-1" : ""
                    }`}
                    style={{
                      background: d.isCurrent ? dc.bg : "transparent",
                      borderColor: d.isCurrent ? dc.border : "transparent",
                      ...(d.isCurrent ? { outline: `1px solid ${dc.border}` } : {}),
                    }}
                  >
                    {/* Order number */}
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}
                    >
                      {i + 1}
                    </span>
                    {/* Icon */}
                    <span className="text-base shrink-0">{d.icon}</span>
                    {/* Name */}
                    <span className={`text-[10px] font-semibold truncate flex-1 min-w-0 ${
                      d.isCurrent ? "text-card-foreground" : "text-muted-foreground"
                    }`}>
                      {d.name}
                      {d.isCurrent && (
                        <span className="text-[7px] font-mono ml-1 opacity-60">← {t.digestCurrentDish}</span>
                      )}
                    </span>
                    {/* Digest time */}
                    <span className="text-[8px] font-mono shrink-0" style={{ color: dc.text }}>
                      {d.stomachMin}{t.digestMinUnit}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Order advice */}
            <p className="text-[9px] text-muted-foreground/60 mt-2 leading-relaxed">
              💡 {t.digestOrderAdvice}
            </p>
          </div>
        )}

        {/* ─── Tactical Advice ─── */}
        <div className={`rounded-xl p-3 border transition-all duration-500 mt-3 ${
          difficulty === "hard" ? "border-destructive/30 bg-destructive/5" : "border-border/30 glass"
        }`}>
          <p className={`text-[10px] leading-relaxed ${
            difficulty === "hard" ? "text-destructive font-bold" : "text-muted-foreground"
          }`}>
            {difficulty === "easy" ? "✅" : difficulty === "moderate" ? "⚡" : "⚠️"} {
              difficulty === "easy" ? t.digestAdviceEasy
              : difficulty === "moderate" ? t.digestAdviceModerate
              : t.digestAdviceHard
            }
          </p>
        </div>
      </div>
    </section>
  );
}
