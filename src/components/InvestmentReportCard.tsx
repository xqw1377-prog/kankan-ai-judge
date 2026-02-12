import { forwardRef } from "react";
import type { Locale } from "@/lib/i18n";

interface InvestmentReportCardProps {
  avgGI: number;
  giVolatility: number;
  balanceScore: number;
  giData: number[];
  suggestions: string[];
  locale?: Locale;
  totalMeals: number;
}

const BRAND: Record<Locale, {
  tagline: string; beta: string; title: string; giVol: string; balance: string; advice: string;
  assets: string; liabilities: string; protein: string; fiber: string;
  sodium: string; sugar: string; satFat: string;
  glCurve: string; correctionLog: string;
}> = {
  "zh-CN": {
    tagline: "每 一 口 都 有 据 可 循",
    beta: "KANKAN 实验室内测官",
    title: "Q1 膳食资产季报",
    giVol: "GI 波动率",
    balance: "均衡度",
    advice: "调仓建议",
    assets: "摄入资产",
    liabilities: "代谢负债",
    protein: "蛋白质",
    fiber: "膳食纤维",
    sodium: "钠",
    sugar: "精制糖",
    satFat: "饱和脂肪",
    glCurve: "GL 净值曲线",
    correctionLog: "调仓操作记录",
  },
  "en-US": {
    tagline: "D A T A - D R I V E N   D I N I N G",
    beta: "KANKAN Lab Beta Tester",
    title: "Q1 Diet Asset Report",
    giVol: "GI Volatility",
    balance: "Balance Score",
    advice: "Rebalance Advice",
    assets: "Intake Assets",
    liabilities: "Metabolic Liabilities",
    protein: "Protein",
    fiber: "Dietary Fiber",
    sodium: "Sodium",
    sugar: "Refined Sugar",
    satFat: "Saturated Fat",
    glCurve: "GL Net Value Curve",
    correctionLog: "Correction Log",
  },
};

const GOLD = "#D4AF37";
const DIM = "rgba(160,174,192,0.5)";
const CARD_BG = "rgba(212,175,55,0.04)";
const CARD_BORDER = "1px solid rgba(212,175,55,0.1)";
const RED = "#EF5350";

function QRPlaceholder() {
  const grid = [
    [1,1,1,0,1,0,1,1,1],[1,0,1,0,0,0,1,0,1],[1,1,1,0,1,0,1,1,1],
    [0,0,0,0,1,0,0,0,0],[1,0,1,1,0,1,1,0,1],[0,0,0,0,1,0,0,0,0],
    [1,1,1,0,0,0,1,1,1],[1,0,1,0,1,0,1,0,1],[1,1,1,0,1,0,1,1,1],
  ];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 5, background: GOLD, padding: 2.5,
      display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gridTemplateRows: "repeat(9, 1fr)", gap: 0.4,
    }}>
      {grid.flat().map((v, i) => (
        <div key={i} style={{ background: v ? "#0A0C10" : GOLD, borderRadius: 0.4 }} />
      ))}
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  const w = 300, h = 60;
  const min = Math.min(...data) - 3;
  const max = Math.max(...data) + 3;
  const riskY = 6 + (1 - (60 - min) / (max - min)) * (h - 12);
  const points = data.map((v, i) => {
    const x = 10 + (i / (data.length - 1)) * (w - 20);
    const y = 6 + (1 - (v - min) / (max - min)) * (h - 12);
    return { x, y, v };
  });
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Risk zone */}
      <rect x={0} y={0} width={w} height={riskY} fill="rgba(239,83,80,0.06)" />
      <line x1={0} y1={riskY} x2={w} y2={riskY} stroke="rgba(239,83,80,0.3)" strokeDasharray="4 3" strokeWidth={0.5} />
      <polyline points={polyline} fill="none" stroke={GOLD} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={polyline} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={8} strokeLinejoin="round" />
      {/* Dots colored by risk */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={p.v >= 60 ? RED : GOLD} />
      ))}
    </svg>
  );
}

const InvestmentReportCard = forwardRef<HTMLDivElement, InvestmentReportCardProps>(
  ({ avgGI, giVolatility, balanceScore, giData, suggestions, locale = "zh-CN", totalMeals }, ref) => {
    const brand = BRAND[locale];
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    // Mock balance sheet data
    const proteinVal = Math.round(totalMeals * 22);
    const fiberVal = Math.round(totalMeals * 4.5);
    const sodiumVal = Math.round(totalMeals * 420);
    const sugarVal = Math.round(totalMeals * 8);
    const satFatVal = Math.round(totalMeals * 5.2);

    // Mock correction records
    const corrections = [
      { pct: "3.2", action: locale === "zh-CN" ? "调整烹饪方式：炸→蒸" : "Cooking: Fried→Steamed" },
      { pct: "1.8", action: locale === "zh-CN" ? "修正克重：鸡胸肉 200g→150g" : "Weight: Chicken 200g→150g" },
      { pct: "2.5", action: locale === "zh-CN" ? "新增食材：西兰花 100g" : "Added: Broccoli 100g" },
    ];

    const sectionLabel = { fontSize: 8, color: DIM, fontWeight: 700 as const, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 8 };

    return (
      <div ref={ref} style={{
        width: 380,
        fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
        background: "linear-gradient(165deg, #0D0B10 0%, #0A0C10 40%, #0E0B12 100%)",
        borderRadius: 20,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "32px 28px 20px",
          background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, transparent 60%)",
          borderBottom: "1px solid rgba(212,175,55,0.12)",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 16, padding: "3px 12px", marginBottom: 16,
          }}>
            <span style={{ fontSize: 12 }}>📊</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: 2, textTransform: "uppercase" as const }}>
              {brand.title}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontSize: 9, color: "rgba(160,174,192,0.4)", fontWeight: 600 }}>{dateStr}</p>
              <p style={{ fontSize: 11, color: "rgba(160,174,192,0.5)", marginTop: 4 }}>
                {totalMeals} meals analyzed
              </p>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 12,
              background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: GOLD, letterSpacing: 1 }}>
                {brand.beta}
              </span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, padding: "20px 28px" }}>
          <div style={{ flex: 1, padding: "14px 16px", borderRadius: 12, background: CARD_BG, border: CARD_BORDER }}>
            <p style={sectionLabel}>{brand.giVol}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: GOLD, marginTop: 4 }}>
              {giVolatility}<span style={{ fontSize: 10, color: DIM, marginLeft: 3 }}>σ</span>
            </p>
            <p style={{ fontSize: 9, color: "rgba(160,174,192,0.4)", marginTop: 2 }}>avg GI {avgGI}</p>
          </div>
          <div style={{ flex: 1, padding: "14px 16px", borderRadius: 12, background: CARD_BG, border: CARD_BORDER }}>
            <p style={sectionLabel}>{brand.balance}</p>
            <p style={{
              fontSize: 26, fontWeight: 900, marginTop: 4,
              color: balanceScore >= 70 ? GOLD : balanceScore >= 50 ? "#FFA726" : RED,
            }}>
              {balanceScore}<span style={{ fontSize: 10, color: DIM, marginLeft: 3 }}>/100</span>
            </p>
          </div>
        </div>

        {/* ═══ Balance Sheet ═══ */}
        <div style={{ padding: "0 28px 16px" }}>
          <p style={sectionLabel}>📋 {brand.assets} / {brand.liabilities}</p>
          <div style={{ display: "flex", gap: 10 }}>
            {/* Assets */}
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: CARD_BG, border: CARD_BORDER }}>
              <p style={{ fontSize: 7, color: "rgba(212,175,55,0.5)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>📈 {brand.assets}</p>
              {[
                { label: brand.protein, value: `${proteinVal}g` },
                { label: brand.fiber, value: `${fiberVal}g` },
              ].map(a => (
                <div key={a.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: "rgba(200,210,220,0.6)" }}>{a.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: GOLD }}>{a.value}</span>
                </div>
              ))}
            </div>
            {/* Liabilities */}
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: CARD_BG, border: CARD_BORDER }}>
              <p style={{ fontSize: 7, color: "rgba(239,83,80,0.5)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>📉 {brand.liabilities}</p>
              {[
                { label: brand.sodium, value: `${sodiumVal}mg`, bad: sodiumVal > 2000 },
                { label: brand.sugar, value: `${sugarVal}g`, bad: sugarVal > 50 },
                { label: brand.satFat, value: `${satFatVal}g`, bad: satFatVal > 20 },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: "rgba(200,210,220,0.6)" }}>{l.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: l.bad ? RED : GOLD }}>{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ GL Net Value Sparkline ═══ */}
        <div style={{ padding: "0 28px 16px" }}>
          <p style={sectionLabel}>📈 {brand.glCurve}</p>
          <div style={{
            borderRadius: 12, overflow: "hidden", padding: "8px 0",
            background: "rgba(10,12,16,0.6)", border: "1px solid rgba(212,175,55,0.06)",
          }}>
            <MiniSparkline data={giData} />
          </div>
        </div>

        {/* ═══ Correction Log ═══ */}
        <div style={{ padding: "0 28px 16px" }}>
          <p style={sectionLabel}>📝 {brand.correctionLog}</p>
          {corrections.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8, marginBottom: 4,
              background: CARD_BG, border: "1px solid rgba(212,175,55,0.08)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
              <p style={{ fontSize: 9, color: "rgba(200,210,220,0.7)", flex: 1 }}>{r.action}</p>
              <span style={{
                fontSize: 8, fontWeight: 800, color: GOLD,
                background: "rgba(212,175,55,0.08)", padding: "2px 6px", borderRadius: 4,
              }}>+{r.pct}%</span>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div style={{ padding: "0 28px 20px" }}>
          <p style={sectionLabel}>💡 {brand.advice}</p>
          {suggestions.slice(0, 2).map((tip, i) => (
            <div key={i} style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 4,
              background: CARD_BG, border: "1px solid rgba(212,175,55,0.08)",
            }}>
              <p style={{ fontSize: 10, color: "rgba(200,210,220,0.7)", lineHeight: 1.5 }}>▸ {tip}</p>
            </div>
          ))}
        </div>

        {/* Brand bar */}
        <div style={{
          background: "#0A0C10",
          borderTop: "1px solid rgba(212,175,55,0.15)",
          padding: "16px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #D4AF37, #F5D060)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#0A0C10",
            }}>K</div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: 3, textTransform: "uppercase" as const }}>KANKAN AI</span>
              <p style={{
                fontSize: 6, color: "rgba(212,175,55,0.35)", margin: 0,
                letterSpacing: locale === "zh-CN" ? 3 : 1.5,
                textTransform: "uppercase" as const, fontWeight: 600,
              }}>{brand.tagline}</p>
            </div>
          </div>
          <QRPlaceholder />
        </div>
      </div>
    );
  }
);

InvestmentReportCard.displayName = "InvestmentReportCard";
export default InvestmentReportCard;
