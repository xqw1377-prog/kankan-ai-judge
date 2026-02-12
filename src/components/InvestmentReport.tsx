import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import InvestmentReportCard from "./InvestmentReportCard";

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

// Generate mock quarterly GI data (12 weeks)
function generateGIData(): number[] {
  const data: number[] = [];
  let v = 52;
  for (let i = 0; i < 12; i++) {
    v += (Math.random() - 0.45) * 8;
    v = Math.max(30, Math.min(85, v));
    data.push(Math.round(v));
  }
  return data;
}

// Generate future prediction (4 weeks)
function generatePrediction(last: number): { value: number; isTurningPoint: boolean }[] {
  const pts: { value: number; isTurningPoint: boolean }[] = [];
  let v = last;
  for (let i = 0; i < 4; i++) {
    const delta = (Math.random() - 0.55) * 6;
    v += delta;
    v = Math.max(30, Math.min(80, v));
    pts.push({ value: Math.round(v), isTurningPoint: i === 1 || i === 3 });
  }
  return pts;
}

function GIKLineChart({ data, predictions }: { data: number[]; predictions: { value: number; isTurningPoint: boolean }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const all = [...data, ...predictions.map(p => p.value)];
    const min = Math.min(...all) - 5;
    const max = Math.max(...all) + 5;
    const padL = 30, padR = 16, padT = 12, padB = 20;
    const cW = w - padL - padR;
    const cH = h - padT - padB;
    const total = all.length;

    const toX = (i: number) => padL + (i / (total - 1)) * cW;
    const toY = (v: number) => padT + (1 - (v - min) / (max - min)) * cH;

    ctx.clearRect(0, 0, w, h);

    // Marble-like subtle texture bg
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "rgba(18,16,20,0.3)");
    bgGrad.addColorStop(0.5, "rgba(25,22,28,0.2)");
    bgGrad.addColorStop(1, "rgba(18,16,20,0.3)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(212,175,55,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = padT + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = "rgba(212,175,55,0.4)";
    ctx.font = "8px 'Space Grotesk', sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i < 5; i++) {
      const val = max - (i / 4) * (max - min);
      ctx.fillText(Math.round(val).toString(), padL - 4, padT + (i / 4) * cH + 3);
    }

    // Today divider
    const todayIdx = data.length - 1;
    const todayX = toX(todayIdx);
    ctx.strokeStyle = "rgba(212,175,55,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(todayX, padT);
    ctx.lineTo(todayX, padT + cH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Historical gold line
    const goldGrad = ctx.createLinearGradient(padL, 0, w - padR, 0);
    goldGrad.addColorStop(0, "rgba(212,175,55,0.5)");
    goldGrad.addColorStop(1, "rgba(212,175,55,0.95)");

    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gold glow
    ctx.strokeStyle = "rgba(212,175,55,0.1)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points
    data.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      // K-line candle body
      const isUp = i === 0 ? true : v >= data[i - 1];
      ctx.fillStyle = isUp ? "rgba(212,175,55,0.9)" : "rgba(255,80,60,0.8)";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Prediction dashed gold line
    ctx.strokeStyle = "rgba(212,175,55,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(todayIdx), toY(data[todayIdx]));
    predictions.forEach((p, i) => {
      ctx.lineTo(toX(todayIdx + 1 + i), toY(p.value));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Prediction glow
    ctx.strokeStyle = "rgba(212,175,55,0.06)";
    ctx.lineWidth = 10;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(todayIdx), toY(data[todayIdx]));
    predictions.forEach((p, i) => {
      ctx.lineTo(toX(todayIdx + 1 + i), toY(p.value));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Turning point markers
    predictions.forEach((p, i) => {
      if (p.isTurningPoint) {
        const x = toX(todayIdx + 1 + i);
        const y = toY(p.value);
        // Diamond marker
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "rgba(212,175,55,0.8)";
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
        // Label
        ctx.fillStyle = "rgba(212,175,55,0.7)";
        ctx.font = "bold 7px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.rebalanceSuggestion, x, y - 10);
      }
    });

    // Today point glow
    const tx = toX(todayIdx);
    const ty = toY(data[todayIdx]);
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14);
    glow.addColorStop(0, "rgba(212,175,55,0.5)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(212,175,55,1)";
    ctx.beginPath();
    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [data, predictions, t]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 160 }} />;
}

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
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s}
          points={Array.from({ length: 5 }, (_, i) => {
            const p = getPoint(i, s);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={0.5}
        />
      ))}
      {/* Axes */}
      {Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(212,175,55,0.1)" strokeWidth={0.5} />;
      })}
      {/* Data polygon */}
      <polygon
        points={values.map((v, i) => {
          const p = getPoint(i, v);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.8)" strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Data dots */}
      {values.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgba(212,175,55,0.9)" />;
      })}
      {/* Labels */}
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

export default function InvestmentReport({ meals, score }: InvestmentReportProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const reportCardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const giData = useMemo(() => generateGIData(), []);
  const predictions = useMemo(() => generatePrediction(giData[giData.length - 1]), [giData]);

  // Calc quarterly stats
  const avgGI = useMemo(() => Math.round(giData.reduce((s, v) => s + v, 0) / giData.length), [giData]);
  const giVolatility = useMemo(() => {
    const mean = giData.reduce((s, v) => s + v, 0) / giData.length;
    const variance = giData.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / giData.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  }, [giData]);

  // Macro balance from meals
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
    // Ideal: P~30%, F~25%, C~45%
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

  // Determine rebalance suggestions
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
              <span className="text-lg">📊</span>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(43, 72%, 52%)" }}>
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
          <div className="rounded-xl p-3" style={{
            background: "hsl(220 15% 8% / 0.8)",
            border: "1px solid hsl(43 72% 52% / 0.1)",
          }}>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t.avgGiVolatility}</p>
            <p className="text-xl font-black tabular-nums" style={{ color: "hsl(43, 72%, 55%)" }}>
              {giVolatility}
              <span className="text-[10px] text-muted-foreground font-normal ml-1">σ</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">avg GI {avgGI}</p>
          </div>
          <div className="rounded-xl p-3" style={{
            background: "hsl(220 15% 8% / 0.8)",
            border: "1px solid hsl(43 72% 52% / 0.1)",
          }}>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t.dietAssetBalance}</p>
            <p className="text-xl font-black tabular-nums" style={{
              color: macroBalance.score >= 70 ? "hsl(43, 72%, 55%)" : macroBalance.score >= 50 ? "hsl(30, 90%, 50%)" : "hsl(0, 72%, 55%)",
            }}>
              {macroBalance.score}
              <span className="text-[10px] text-muted-foreground font-normal ml-1">/ 100</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{t.balanceScore}</p>
          </div>
        </div>

        {/* GI K-Line Chart */}
        <div className="px-5 pb-3 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{t.giTrendLine}</p>
          <div className="rounded-xl overflow-hidden" style={{
            background: "hsl(220 15% 6% / 0.6)",
            border: "1px solid hsl(43 72% 52% / 0.06)",
          }}>
            <GIKLineChart data={giData} predictions={predictions} />
          </div>
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

        {/* Rebalance suggestions */}
        <div className="px-5 pb-4 relative z-10">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            💡 {t.rebalanceSuggestion}
          </p>
          <div className="space-y-1.5">
            {suggestions.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{
                background: "hsl(43 72% 52% / 0.05)",
                border: "1px solid hsl(43 72% 52% / 0.08)",
              }}>
                <span className="text-[10px] mt-0.5" style={{ color: "hsl(43, 72%, 52%)" }}>▸</span>
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
          giData={giData}
          suggestions={suggestions}
          locale={locale}
          totalMeals={meals.length}
        />
      </div>
    </section>
  );
}
