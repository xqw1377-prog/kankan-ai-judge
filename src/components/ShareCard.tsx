import { forwardRef } from "react";

interface ShareCardProps {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  verdict: string;
  roast: string;
  ingredients: { name: string; grams: number }[];
}

/** Draw a ring chart as inline SVG */
function MacroRing({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ textAlign: "center", width: 80 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke="#e8f5e9" strokeWidth={6} />
        <circle
          cx={36} cy={36} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x={36} y={33} textAnchor="middle" fontSize={14} fontWeight={800} fill={color}>{value}</text>
        <text x={36} y={46} textAnchor="middle" fontSize={8} fill="#8a9e8a">{unit}</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#5a6e5a", marginTop: -2 }}>{label}</div>
    </div>
  );
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ food, calories, protein_g, fat_g, carbs_g, verdict, roast, ingredients }, ref) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    const isNeg = verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高");
    const isPos = verdict.includes("不错") || verdict.includes("健康") || verdict.includes("均衡");

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          padding: 0,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
          background: "linear-gradient(165deg, #f0faf1 0%, #ffffff 40%, #f5f9f5 100%)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "hsl(122 39% 49% / 0.08)" }} />
        <div style={{ position: "absolute", bottom: 60, left: -30, width: 80, height: 80, borderRadius: "50%", background: "hsl(122 39% 49% / 0.06)" }} />

        <div style={{ padding: "28px 28px 0" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 16, position: "relative" }}>
            <div style={{ fontSize: 48 }}>🍜</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a2e1a", margin: "8px 0 4px", letterSpacing: -0.5 }}>
              {food}
            </h2>
            <p style={{ fontSize: 12, color: "#8a9e8a", fontWeight: 500 }}>{dateStr}</p>
          </div>

          {/* Roast - big center text */}
          {roast && (
            <div style={{
              background: isNeg ? "hsl(30 100% 50% / 0.06)" : "hsl(122 39% 49% / 0.06)",
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 16,
              textAlign: "center",
            }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#2a3e2a", lineHeight: 1.6 }}>
                "{roast}"
              </p>
            </div>
          )}

          {/* Macro ring charts */}
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
            <MacroRing value={calories} max={2100} color="#4CAF50" label="热量" unit="kcal" />
            <MacroRing value={protein_g} max={120} color="#2196F3" label="蛋白质" unit="g" />
            <MacroRing value={fat_g} max={58} color="#FF9800" label="脂肪" unit="g" />
            <MacroRing value={carbs_g} max={263} color="#9C27B0" label="碳水" unit="g" />
          </div>

          {/* Top ingredients */}
          {ingredients.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8a9e8a", marginBottom: 8 }}>主要食材</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ingredients.slice(0, 6).map((item, i) => (
                  <span key={i} style={{ fontSize: 11, background: "hsl(122 39% 49% / 0.1)", color: "#3a7a3a", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
                    {item.name} {item.grams}g
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verdict */}
          {verdict && (
            <div style={{
              background: isNeg ? "hsl(0 84% 60% / 0.06)" : isPos ? "hsl(122 39% 49% / 0.06)" : "hsl(0 0% 0% / 0.03)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 20,
              borderLeft: `3px solid ${isNeg ? "hsl(0, 84%, 60%)" : isPos ? "hsl(122, 39%, 49%)" : "#ccc"}`,
            }}>
              <p style={{ fontSize: 13, color: "#2a3e2a", lineHeight: 1.6, fontWeight: 500 }}>
                {isNeg ? "⚠️" : isPos ? "✅" : "📋"} {verdict}
              </p>
            </div>
          )}
        </div>

        {/* Brand bar */}
        <div style={{
          background: "linear-gradient(135deg, #2e7d32, #4CAF50)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "white",
            }}>K</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: 1.5 }}>KANKAN AI</span>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", margin: 0 }}>数字化饮食实验室</p>
            </div>
          </div>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>5年1000店计划</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
