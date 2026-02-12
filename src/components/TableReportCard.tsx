import { forwardRef } from "react";
import type { Locale } from "@/lib/i18n";

interface TableMember {
  name: string;
  avatar: string;
  scoreDelta: number;
}

interface TableReportCardProps {
  food: string;
  totalWeight: number;
  claimedWeight: number;
  totalCarbs: number;
  members: TableMember[];
  locale?: Locale;
}

const BRAND: Record<Locale, { tagline: string; lab: string; ranking: string; carbsSummary: (g: number) => string; glRisk: string; glStable: string; title: string }> = {
  "zh-CN": {
    tagline: "每 一 口 都 有 据 可 循",
    lab: "数 字 化 饮 食 实 验 室",
    ranking: "健康分资产排行",
    carbsSummary: (g) => `本桌共消灭 ${g}g 碳水资产`,
    glRisk: "平均血糖风险",
    glStable: "稳健",
    title: "拼桌实验室战报",
  },
  "en-US": {
    tagline: "D A T A - D R I V E N   D I N I N G",
    lab: "Digital Dining Laboratory",
    ranking: "Health Score Ranking",
    carbsSummary: (g) => `This table consumed ${g}g of carb assets`,
    glRisk: "Avg GL Risk",
    glStable: "Stable",
    title: "Table Lab Battle Report",
  },
};

function QRPlaceholder() {
  const grid = [
    [1,1,1,0,1,0,1,1,1],
    [1,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,1,1],
    [0,0,0,0,1,0,0,0,0],
    [1,0,1,1,0,1,1,0,1],
    [0,0,0,0,1,0,0,0,0],
    [1,1,1,0,0,0,1,1,1],
    [1,0,1,0,1,0,1,0,1],
    [1,1,1,0,1,0,1,1,1],
  ];
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 6,
      background: "#D4AF37", padding: 3,
      display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gridTemplateRows: "repeat(9, 1fr)", gap: 0.5,
    }}>
      {grid.flat().map((v, i) => (
        <div key={i} style={{ background: v ? "#0A0C10" : "#D4AF37", borderRadius: 0.5 }} />
      ))}
    </div>
  );
}

const TableReportCard = forwardRef<HTMLDivElement, TableReportCardProps>(
  ({ food, totalWeight, claimedWeight, totalCarbs, members, locale = "zh-CN" }, ref) => {
    const brand = BRAND[locale];
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const sorted = [...members].sort((a, b) => b.scoreDelta - a.scoreDelta);

    return (
      <div ref={ref} style={{
        width: 380,
        fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
        background: "#0A0C10",
        borderRadius: 20,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "28px 24px 20px",
          background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(10,12,16,1) 100%)",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 20, padding: "4px 14px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 14 }}>⚖️</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#D4AF37", letterSpacing: 2, textTransform: "uppercase" as const }}>
              {brand.title}
            </span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "white", letterSpacing: -0.5 }}>{food}</h2>
          <p style={{ fontSize: 11, color: "rgba(160,174,192,0.5)", marginTop: 6 }}>{dateStr}</p>

          {/* Balance summary */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 32, marginTop: 16,
          }}>
            <div>
              <p style={{ fontSize: 9, color: "rgba(160,174,192,0.5)", fontWeight: 600, letterSpacing: 1 }}>TOTAL</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: "white" }}>{totalWeight}g</p>
            </div>
            <div style={{ width: 1, background: "rgba(212,175,55,0.2)" }} />
            <div>
              <p style={{ fontSize: 9, color: "rgba(160,174,192,0.5)", fontWeight: 600, letterSpacing: 1 }}>CLAIMED</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#D4AF37" }}>{Math.round(claimedWeight)}g</p>
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(160,174,192,0.5)", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 12 }}>
            {brand.ranking}
          </p>
          {sorted.map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", marginBottom: 6,
              borderRadius: 12,
              background: i === 0
                ? "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)"
                : "rgba(255,255,255,0.02)",
              border: i === 0 ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{
                fontSize: 14, fontWeight: 900,
                color: i === 0 ? "#D4AF37" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(160,174,192,0.4)",
                width: 20, textAlign: "center",
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 20 }}>{m.avatar}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "white", flex: 1 }}>{m.name}</span>
              <span style={{
                fontSize: 14, fontWeight: 900,
                color: m.scoreDelta >= 0 ? "#66BB6A" : "#EF5350",
              }}>
                {m.scoreDelta >= 0 ? "+" : ""}{m.scoreDelta}
              </span>
            </div>
          ))}
        </div>

        {/* Data assets summary */}
        <div style={{
          margin: "0 24px 20px",
          padding: "14px 16px",
          borderRadius: 12,
          background: "rgba(212,175,55,0.05)",
          border: "1px solid rgba(212,175,55,0.12)",
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(160,174,192,0.7)", marginBottom: 4 }}>
            📊 {brand.carbsSummary(Math.round(totalCarbs))}
          </p>
          <p style={{ fontSize: 11, color: "rgba(160,174,192,0.45)" }}>
            {brand.glRisk}：<span style={{ color: "#66BB6A", fontWeight: 700 }}>🟢 {brand.glStable}</span>
          </p>
        </div>

        {/* Brand bar */}
        <div style={{
          background: "#0A0C10",
          borderTop: "1px solid rgba(212,175,55,0.2)",
          padding: "18px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #D4AF37, #F5D060)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 900, color: "#0A0C10",
            }}>K</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#D4AF37", letterSpacing: 4, textTransform: "uppercase" as const }}>KANKAN AI</span>
              <p style={{
                fontSize: 7, color: "rgba(212,175,55,0.4)", margin: 0,
                letterSpacing: locale === "zh-CN" ? 4 : 2,
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

TableReportCard.displayName = "TableReportCard";
export default TableReportCard;
