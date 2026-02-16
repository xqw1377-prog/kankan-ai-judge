import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Globe, ChevronDown, BarChart3, Scale } from "lucide-react";
import { useMeals, MealRecord } from "@/hooks/useMeals";
import { getMealTypeLabel } from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { useToast } from "@/hooks/use-toast";

type SequenceBadge = "perfect" | "suboptimal" | "asset_loss";

function classifyIngredientType(name: string): "fiber" | "protein" | "carb" {
  const l = name.toLowerCase();
  if (/菜|蔬|叶|菠|芹|笋|瓜|萝卜|broccoli|spinach|lettuce|vegetable|greens|salad|celery|cucumber/.test(l)) return "fiber";
  if (/鸡|鸭|鹅|猪|牛|羊|肉|鱼|虾|蟹|蛋|豆腐|chicken|duck|pork|beef|lamb|meat|fish|shrimp|egg|tofu|protein/.test(l)) return "protein";
  return "carb";
}

function evaluateMealSequence(ingredients: Array<{ name: string; grams: number }>): SequenceBadge {
  if (!ingredients || ingredients.length <= 1) return "perfect";
  const types = ingredients.map(i => classifyIngredientType(i.name));
  const firstCarb = types.indexOf("carb");
  const firstFiber = types.indexOf("fiber");
  if (firstCarb !== -1 && firstCarb === 0) return "asset_loss";
  if (firstFiber === 0) return "perfect";
  return "suboptimal";
}

function generateMiniCurve(badge: SequenceBadge): Array<{ m: number; f: number }> {
  const pts: Array<{ m: number; f: number }> = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const minutes = Math.round(t * 240);
    let focus: number;
    if (badge === "asset_loss") {
      const spike = Math.exp(-((t - 0.12) ** 2) / 0.008) * 55;
      const crash = t > 0.2 ? -55 * (t - 0.2) : 0;
      focus = Math.max(12, 48 + spike + crash);
    } else if (badge === "perfect") {
      focus = 82 + 14 * Math.sin(t * Math.PI * 0.7) * (1 - t * 0.12);
    } else {
      const spike = Math.exp(-((t - 0.25) ** 2) / 0.03) * 22;
      const dip = t > 0.45 ? -15 * (t - 0.45) : 0;
      focus = 62 + spike + dip;
    }
    pts.push({ m: minutes, f: Math.round(focus) });
  }
  return pts;
}

const BADGE_CONFIG: Record<SequenceBadge, { emoji: string; colorClass: string; glowColor: string; strokeColor: string; fillColor: string }> = {
  perfect: {
    emoji: "🏆",
    colorClass: "text-[hsl(160,70%,45%)] bg-[hsl(160,70%,45%,0.1)] border-[hsl(160,70%,45%,0.3)]",
    glowColor: "rgba(57,200,100,0.15)",
    strokeColor: "hsl(160, 70%, 45%)",
    fillColor: "hsl(160, 70%, 45%, 0.15)",
  },
  suboptimal: {
    emoji: "⚡",
    colorClass: "text-[hsl(43,80%,52%)] bg-[hsl(43,80%,52%,0.1)] border-[hsl(43,80%,52%,0.3)]",
    glowColor: "rgba(212,175,55,0.15)",
    strokeColor: "hsl(43, 80%, 52%)",
    fillColor: "hsl(43, 80%, 52%, 0.15)",
  },
  asset_loss: {
    emoji: "📉",
    colorClass: "text-destructive bg-destructive/10 border-destructive/30",
    glowColor: "rgba(255,50,50,0.15)",
    strokeColor: "hsl(0, 72%, 55%)",
    fillColor: "hsl(0, 72%, 55%, 0.15)",
  },
};

type Feeling = "great" | "ok" | "bad" | null;

interface MealCardProps {
  meal: MealRecord;
  onNavigate: (id: string) => void;
}

function MealCard({ meal, onNavigate }: MealCardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [feeling, setFeeling] = useState<Feeling>(null);
  const [showCompare, setShowCompare] = useState(false);

  const badge = evaluateMealSequence(meal.ingredients);
  const cfg = BADGE_CONFIG[badge];
  const badgeLabel = badge === "perfect" ? t.historyBadgePerfect
    : badge === "suboptimal" ? t.historyBadgeSuboptimal
    : t.historyBadgeAssetLoss;

  const curve = expanded ? generateMiniCurve(badge) : [];

  const handleFeeling = (f: Feeling) => {
    setFeeling(f);
    toast({ title: t.historyFeedbackSaved });
  };

  return (
    <div className="glass rounded-xl shadow-card overflow-hidden transition-all duration-300">
      {/* Main row */}
      <button
        onClick={() => onNavigate(meal.id)}
        className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
      >
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-card-foreground truncate">{meal.food_name}</p>
            {/* Tactical badge */}
            <span className={`inline-flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.colorClass}`}>
              {cfg.emoji} {badgeLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="text-sm font-bold text-primary shrink-0">{meal.calories}kcal</span>
      </button>

      {/* Expand toggle bar */}
      <div className="flex items-center justify-center gap-4 border-t border-border/10 px-3">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex items-center gap-1 py-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <BarChart3 className="w-3 h-3" />
          <span className="text-[8px] font-mono">{t.historyEnergyForecast}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded: mini oscilloscope + compare */}
      {expanded && (
        <div className="px-4 pb-3 animate-fade-in">
          {/* Mini chart */}
          <div className="rounded-lg p-2 border border-border/20" style={{ background: cfg.glowColor }}>
            <p className="text-[8px] font-mono text-muted-foreground/60 mb-1 flex items-center gap-1">
              📈 {t.historyFocusForecast}
            </p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={curve} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id={`grad-${meal.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.strokeColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={cfg.strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fontSize: 7, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${Math.floor(v / 60)}h`}
                  axisLine={false} tickLine={false} interval={6}
                />
                <YAxis domain={[0, 100]} hide />
                {badge === "asset_loss" && (
                  <ReferenceLine y={40} stroke="hsl(0,72%,55%)" strokeDasharray="3 3" strokeWidth={0.5} />
                )}
                <Area type="monotone" dataKey="f" stroke={cfg.strokeColor} strokeWidth={1.5}
                  fill={`url(#grad-${meal.id})`} animationDuration={600} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Compare / Reconciliation */}
          {!showCompare ? (
            <button
              onClick={() => setShowCompare(true)}
              className="mt-2 flex items-center gap-1 text-[9px] font-mono text-primary/60 hover:text-primary transition-colors"
            >
              <Scale className="w-3 h-3" /> {t.historyCompareBtn}
            </button>
          ) : (
            <div className="mt-2 rounded-lg border border-border/20 p-2.5 animate-fade-in">
              <p className="text-[9px] font-mono text-muted-foreground mb-2">{t.historyActualFeeling}</p>
              <div className="flex gap-2">
                {([
                  { key: "great" as Feeling, label: t.historyFeelingGreat },
                  { key: "ok" as Feeling, label: t.historyFeelingOk },
                  { key: "bad" as Feeling, label: t.historyFeelingBad },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleFeeling(opt.key)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono border transition-all ${
                      feeling === opt.key
                        ? "border-primary/40 bg-primary/10 text-card-foreground font-bold"
                        : "border-border/20 text-muted-foreground hover:border-border/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {feeling && (
                <p className="text-[7px] font-mono text-primary/50 mt-1.5">{t.historyCalibrationNote}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const History = () => {
  const navigate = useNavigate();
  const { meals, loading } = useMeals();
  const { t, locale, setLocale } = useI18n();

  const grouped = meals.reduce((acc, meal) => {
    const dateFmt = locale === "zh-CN"
      ? new Date(meal.recorded_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })
      : new Date(meal.recorded_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
    if (!acc[dateFmt]) acc[dateFmt] = [];
    acc[dateFmt].push(meal);
    return acc;
  }, {} as Record<string, typeof meals>);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-card-foreground">{t.navHistory}</h1>
        <button
          onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass text-[10px] font-bold text-muted-foreground tracking-wider"
        >
          <Globe className="w-3 h-3" />
          {locale === "zh-CN" ? "EN" : "中"}
        </button>
      </header>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">{t.noRecords}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> {t.takePhoto}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-6 space-y-5">
          {Object.entries(grouped).map(([date, dateMeals]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📅 {date}</p>
              <div className="space-y-2">
                {dateMeals.map(meal => (
                  <MealCard key={meal.id} meal={meal} onNavigate={(id) => navigate(`/meal/${id}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
