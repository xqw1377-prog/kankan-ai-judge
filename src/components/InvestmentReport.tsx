import { useRef, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import InvestmentReportCard from "./InvestmentReportCard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Meal {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  recorded_at: string;
}

interface InvestmentReportProps {
  meals: Meal[];
  score: number;
}

const GOLD = "hsl(43, 72%, 52%)";
const GOLD_DIM = "hsl(43, 72%, 52%, 0.6)";
const RED = "hsl(0, 72%, 55%)";
const RED_DIM = "hsl(0, 72%, 55%, 0.15)";
const DARK_BG = "hsl(220 15% 6% / 0.8)";
const CARD_BORDER = "hsl(43 72% 52% / 0.1)";

// Generate GL (Glycemic Load) weekly data for 12 weeks
function generateGLData(): { week: number; gl: number; predicted?: boolean }[] {
  const data: { week: number; gl: number; predicted?: boolean }[] = [];
  let v = 48;
  for (let i = 1; i <= 12; i++) {
    v += (Math.random() - 0.45) * 10;
    v = Math.max(20, Math.min(90, v));
    data.push({ week: i, gl: Math.round(v) });
  }
  // Add 4 predicted weeks
  for (let i = 13; i <= 16; i++) {
    v += (Math.random() - 0.55) * 7;
    v = Math.max(20, Math.min(85, v));
    data.push({ week: i, gl: Math.round(v), predicted: true });
  }
  return data;
}

// Generate mock correction records
function generateCorrectionRecords() {
  const now = Date.now();
  const DAY = 86400000;
  return [
    { date: new Date(now - DAY * 2).toLocaleDateString(), pct: "3.2", action: "调整烹饪方式：炸→蒸" },
    { date: new Date(now - DAY * 5).toLocaleDateString(), pct: "1.8", action: "修正克重：鸡胸肉 200g→150g" },
    { date: new Date(now - DAY * 9).toLocaleDateString(), pct: "2.5", action: "新增食材：西兰花 100g" },
  ];
}

// ──── Balance Sheet Section ────
function BalanceSheet({ meals, t }: { meals: Meal[]; t: any }) {
  const stats = useMemo(() => {
    if (meals.length === 0) {
      return { protein: 0, fiber: 0, sodium: 0, sugar: 0, satFat: 0 };
    }
    const totals = meals.reduce(
      (a, m) => ({ p: a.p + m.protein_g, f: a.f + m.fat_g, c: a.c + m.carbs_g, cal: a.cal + m.calories }),
      { p: 0, f: 0, c: 0, cal: 0 }
    );
    return {
      protein: Math.round(totals.p),
      fiber: Math.round(totals.c * 0.08), // estimate
      sodium: Math.round(meals.length * 420), // ~420mg per meal estimate
      sugar: Math.round(totals.c * 0.15), // estimate refined sugar
      satFat: Math.round(totals.f * 0.35), // estimate saturated fat
    };
  }, [meals]);

  const assets = [
    { label: t.proteinAsset, value: `${stats.protein}g`, good: true },
    { label: t.fiberAsset, value: `${stats.fiber}g`, good: true },
  ];
  const liabilities = [
    { label: t.sodiumLiability, value: `${stats.sodium}mg`, bad: stats.sodium > 2000 },
    { label: t.refinedSugarLiability, value: `${stats.sugar}g`, bad: stats.sugar > 50 },
    { label: t.saturatedFatLiability, value: `${stats.satFat}g`, bad: stats.satFat > 20 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Assets (Left) */}
      <div className="rounded-xl p-3" style={{ background: DARK_BG, border: `1px solid ${CARD_BORDER}` }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: GOLD_DIM }}>
          🧬 {t.intakeAssets}
        </p>
        <div className="space-y-2">
          {assets.map((a) => (
            <div key={a.label} className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{a.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: GOLD }}>{a.value}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Liabilities (Right) */}
      <div className="rounded-xl p-3" style={{ background: DARK_BG, border: `1px solid ${CARD_BORDER}` }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(0 60% 55% / 0.6)" }}>
          ⚠️ {t.metabolicLiabilities}
        </p>
        <div className="space-y-2">
          {liabilities.map((l) => (
            <div key={l.label} className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{l.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: l.bad ? RED : GOLD }}>{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──── GL Net Value K-Line (Recharts) ────
function GLNetValueChart({ data, t }: { data: { week: number; gl: number; predicted?: boolean }[]; t: any }) {
  const riskThreshold = 60;

  return (
    <div className="rounded-xl overflow-hidden p-2" style={{ background: "hsl(220 15% 6% / 0.6)", border: `1px solid hsl(43 72% 52% / 0.06)` }}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
          <defs>
            <linearGradient id="glGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(43, 72%, 52%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(43, 72%, 52%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="glRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(43 72% 52% / 0.06)" />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => t.weekLabel(w)}
            tick={{ fill: "hsl(43 72% 52% / 0.4)", fontSize: 9 }}
            axisLine={{ stroke: "hsl(43 72% 52% / 0.1)" }}
            tickLine={false}
          />
          <YAxis
            domain={[15, 95]}
            tick={{ fill: "hsl(43 72% 52% / 0.4)", fontSize: 9 }}
            axisLine={{ stroke: "hsl(43 72% 52% / 0.1)" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(220 15% 8%)",
              border: "1px solid hsl(43 72% 52% / 0.2)",
              borderRadius: 8,
              fontSize: 11,
              color: "hsl(43 72% 55%)",
            }}
            labelFormatter={(w) => t.weekLabel(w)}
            formatter={(value: number) => [value, "GL"]}
          />
          {/* Risk zone reference area */}
          <ReferenceLine
            y={riskThreshold}
            stroke="hsl(0, 72%, 55%, 0.4)"
            strokeDasharray="5 5"
            label={{
              value: t.glRiskZone,
              fill: "hsl(0 72% 55% / 0.5)",
              fontSize: 8,
              position: "insideTopRight",
            }}
          />
          <Area
            type="monotone"
            dataKey="gl"
            stroke="hsl(43, 72%, 52%)"
            strokeWidth={2}
            fill="url(#glGoldGrad)"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const isRisk = payload.gl >= riskThreshold;
              const isPredicted = payload.predicted;
              return (
                <circle
                  key={`dot-${payload.week}`}
                  cx={cx}
                  cy={cy}
                  r={isPredicted ? 3 : 4}
                  fill={isRisk ? RED : GOLD}
                  stroke={isPredicted ? "hsl(43 72% 52% / 0.3)" : "none"}
                  strokeWidth={isPredicted ? 2 : 0}
                  strokeDasharray={isPredicted ? "2 2" : undefined}
                />
              );
            }}
            activeDot={{ r: 6, fill: GOLD, stroke: "hsl(220 15% 6%)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 mb-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
          <span className="text-[9px] text-muted-foreground">{t.glSteady}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
          <span className="text-[9px] text-muted-foreground">{t.glRiskZone}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full border border-dashed" style={{ borderColor: GOLD_DIM }} />
          <span className="text-[9px] text-muted-foreground">{t.predicted7d}</span>
        </div>
      </div>
    </div>
  );
}

// ──── Correction Records ────
function CorrectionLog({ records, t }: { records: { date: string; pct: string; action: string }[]; t: any }) {
  if (records.length === 0) {
    return <p className="text-[11px] text-muted-foreground text-center py-3">{t.noCorrectionRecords}</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "hsl(43 72% 52% / 0.04)", border: "1px solid hsl(43 72% 52% / 0.08)" }}
        >
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
            {i < records.length - 1 && (
              <div className="w-px flex-1 mt-1" style={{ background: "hsl(43 72% 52% / 0.15)" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">{r.date}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                color: GOLD,
                background: "hsl(43 72% 52% / 0.08)",
              }}>
                +{r.pct}%
              </span>
            </div>
            <p className="text-[11px] text-card-foreground leading-snug">{r.action}</p>
            <p className="text-[9px] mt-0.5" style={{ color: GOLD_DIM }}>
              {t.correctionEntry(r.pct)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──── Radar Chart (kept from original) ────
function RadarChart({ protein, fat, carbs, fiber, vitamins }: { protein: number; fat: number; carbs: number; fiber: number; vitamins: number }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const labels = ["P", "F", "C", "Fiber", "Vit"];
  const values = [protein, fat, carbs, fiber, vitamins];

  const getPoint = (i: number, val: number) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const dist = r * val;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s}
          points={Array.from({ length: 5 }, (_, i) => {
            const p = getPoint(i, s);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(212,175,55,0.1)" strokeWidth={0.5} />;
      })}
      <polygon
        points={values.map((v, i) => {
          const p = getPoint(i, v);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.8)" strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgba(212,175,55,0.9)" />;
      })}
      {labels.map((label, i) => {
        const p = getPoint(i, 1.18);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fontSize={8} fontWeight={700} fill="rgba(212,175,55,0.5)"
          >{label}</text>
        );
      })}
    </svg>
  );
}

// ──── Main Component ────
export default function InvestmentReport({ meals, score }: InvestmentReportProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const reportCardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const glData = useMemo(() => generateGLData(), []);
  const correctionRecords = useMemo(() => generateCorrectionRecords(), []);

  const avgGI = useMemo(() => {
    const historical = glData.filter(d => !d.predicted);
    return Math.round(historical.reduce((s, d) => s + d.gl, 0) / historical.length);
  }, [glData]);

  const giVolatility = useMemo(() => {
    const historical = glData.filter(d => !d.predicted).map(d => d.gl);
    const mean = historical.reduce((s, v) => s + v, 0) / historical.length;
    const variance = historical.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / historical.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  }, [glData]);

  const macroBalance = useMemo(() => {
    if (meals.length === 0) return { protein: 0.5, fat: 0.5, carbs: 0.5, fiber: 0.3, vitamins: 0.4, score: 65 };
    const totals = meals.reduce(
      (acc, m) => ({ p: acc.p + m.protein_g, f: acc.f + m.fat_g, c: acc.c + m.carbs_g }),
      { p: 0, f: 0, c: 0 }
    );
    const total = totals.p + totals.f + totals.c || 1;
    const pRatio = totals.p / total;
    const fRatio = totals.f / total;
    const cRatio = totals.c / total;
    const pScore = 1 - Math.abs(pRatio - 0.3) * 3;
    const fScore = 1 - Math.abs(fRatio - 0.25) * 3;
    const cScore = 1 - Math.abs(cRatio - 0.45) * 2;
    const balScore = Math.round(Math.max(0, Math.min(100, ((pScore + fScore + cScore) / 3) * 100)));
    return {
      protein: Math.min(1, pRatio * 3),
      fat: Math.min(1, fRatio * 3.5),
      carbs: Math.min(1, cRatio * 2),
      fiber: 0.3 + Math.random() * 0.3,
      vitamins: 0.4 + Math.random() * 0.25,
      score: balScore,
    };
  }, [meals]);

  const suggestions = useMemo(() => {
    const tips: string[] = [];
    if (macroBalance.fiber < 0.5) tips.push(t.fiberPositionHint);
    if (macroBalance.protein < 0.6) tips.push(t.proteinPositionHint);
    if (macroBalance.carbs > 0.8) tips.push(t.carbsPositionHint);
    if (tips.length === 0) tips.push(t.fiberPositionHint);
    return tips;
  }, [macroBalance, t]);

  const handleExport = useCallback(async () => {
    if (!reportCardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportCardRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `KanKan-Q1-Report-${Date.now()}.png`;
      link.click();
      toast({ title: t.reportExported });
    } catch {
      toast({ title: t.generateFailed });
    } finally {
      setGenerating(false);
    }
  }, [toast, t]);

  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.investmentReport} <span className="flex-1 h-px bg-border" />
      </h3>

      <div className="rounded-2xl shadow-card overflow-hidden relative" style={{
        background: "linear-gradient(145deg, hsl(270 8% 7%) 0%, hsl(220 15% 6%) 40%, hsl(260 10% 8%) 100%)",
        border: "1px solid hsl(43 72% 52% / 0.12)",
      }}>
        {/* Marble texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔬</span>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>
                {t.quarterlyReport}
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ color: "hsl(43, 72%, 55%)", background: "hsl(43 72% 52% / 0.1)", border: "1px solid hsl(43 72% 52% / 0.15)" }}>
              {t.betaTester}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-4 relative z-10">
          <div className="rounded-xl p-3" style={{ background: DARK_BG, border: `1px solid ${CARD_BORDER}` }}>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t.avgGiVolatility}</p>
            <p className="text-xl font-black tabular-nums" style={{ color: GOLD }}>
              {giVolatility}
              <span className="text-[10px] text-muted-foreground font-normal ml-1">σ</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">avg GL {avgGI}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: DARK_BG, border: `1px solid ${CARD_BORDER}` }}>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t.dietAssetBalance}</p>
            <p className="text-xl font-black tabular-nums" style={{
              color: macroBalance.score >= 70 ? GOLD : macroBalance.score >= 50 ? "hsl(30, 90%, 50%)" : RED,
            }}>
              {macroBalance.score}
              <span className="text-[10px] text-muted-foreground font-normal ml-1">/ 100</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{t.balanceScore}</p>
          </div>
        </div>

        {/* ═══ Balance Sheet ═══ */}
        <div className="px-5 pb-4 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            🧪 {t.intakeAssets} / {t.metabolicLiabilities}
          </p>
          <BalanceSheet meals={meals} t={t} />
        </div>

        {/* ═══ GL Net Value K-Line (Recharts) ═══ */}
        <div className="px-5 pb-4 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{t.glNetValueCurve}</p>
          <GLNetValueChart data={glData} t={t} />
        </div>

        {/* Radar Chart */}
        <div className="px-5 pb-3 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{t.macroRadar}</p>
          <div className="flex items-center justify-center rounded-xl py-2" style={{
            background: "hsl(220 15% 6% / 0.6)",
            border: "1px solid hsl(43 72% 52% / 0.06)",
          }}>
            <RadarChart
              protein={macroBalance.protein}
              fat={macroBalance.fat}
              carbs={macroBalance.carbs}
              fiber={macroBalance.fiber}
              vitamins={macroBalance.vitamins}
            />
          </div>
        </div>

        {/* ═══ Correction Log ═══ */}
        <div className="px-5 pb-4 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            📝 {t.correctionLog}
          </p>
          <CorrectionLog records={correctionRecords} t={t} />
        </div>

        {/* Rebalance suggestions */}
        <div className="px-5 pb-4 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            🩺 {t.rebalanceSuggestion}
          </p>
          <div className="space-y-1.5">
            {suggestions.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{
                background: "hsl(43 72% 52% / 0.05)",
                border: "1px solid hsl(43 72% 52% / 0.08)",
              }}>
                <span className="text-[10px] mt-0.5" style={{ color: GOLD }}>▸</span>
                <p className="text-[11px] text-card-foreground leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export button */}
        <div className="px-5 pb-5 relative z-10">
          <button
            onClick={handleExport}
            disabled={generating}
            className="w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, hsl(43 72% 45%), hsl(43 80% 55%))",
              color: "hsl(220, 20%, 5%)",
              boxShadow: "0 0 24px hsl(43 72% 52% / 0.2)",
            }}
          >
            📸 {generating ? t.generating : t.exportReport}
          </button>
        </div>
      </div>

      {/* Hidden report card for export */}
      <div style={{ position: "fixed", left: -9999, top: 0 }}>
        <InvestmentReportCard
          ref={reportCardRef}
          avgGI={avgGI}
          giVolatility={giVolatility}
          balanceScore={macroBalance.score}
          giData={glData.filter(d => !d.predicted).map(d => d.gl)}
          suggestions={suggestions}
          locale={locale}
          totalMeals={meals.length}
        />
      </div>
    </section>
  );
}
