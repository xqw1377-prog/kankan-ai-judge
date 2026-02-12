import { forwardRef } from "react";

interface ShareCardProps {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  verdict: string;
  ingredients: { name: string; grams: number }[];
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ food, calories, protein_g, fat_g, carbs_g, verdict, ingredients }, ref) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    const isNeg = verdict.includes("超标") || verdict.includes("过量") || verdict.includes("偏高");
    const isPos = verdict.includes("不错") || verdict.includes("健康") || verdict.includes("均衡");

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          padding: 28,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
          background: "linear-gradient(165deg, #f0faf1 0%, #ffffff 50%, #f5f9f5 100%)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "hsl(122 39% 49% / 0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "hsl(122 39% 49% / 0.06)",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20, position: "relative" }}>
          <div style={{ fontSize: 48 }}>🍜</div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#1a2e1a",
              margin: "8px 0 4px",
              letterSpacing: -0.5,
            }}
          >
            {food}
          </h2>
          <p style={{ fontSize: 12, color: "#8a9e8a", fontWeight: 500 }}>{dateStr}</p>
        </div>

        {/* Macro ring area */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            background: "hsl(122 39% 49% / 0.06)",
            borderRadius: 14,
            padding: "16px 8px",
            marginBottom: 16,
          }}
        >
          {[
            { label: "热量", value: calories, unit: "kcal", color: "#4CAF50" },
            { label: "蛋白质", value: protein_g, unit: "g", color: "#2196F3" },
            { label: "脂肪", value: fat_g, unit: "g", color: "#FF9800" },
            { label: "碳水", value: carbs_g, unit: "g", color: "#9C27B0" },
          ].map((m) => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: "#8a9e8a", marginTop: 2 }}>
                {m.unit}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#5a6e5a", marginTop: 4 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top ingredients */}
        {ingredients.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8a9e8a", marginBottom: 8 }}>
              主要食材
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ingredients.slice(0, 6).map((item, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    background: "hsl(122 39% 49% / 0.1)",
                    color: "#3a7a3a",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {item.name} {item.grams}g
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div
            style={{
              background: isNeg ? "hsl(0 84% 60% / 0.06)" : isPos ? "hsl(122 39% 49% / 0.06)" : "hsl(0 0% 0% / 0.03)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 20,
              borderLeft: `3px solid ${isNeg ? "hsl(0, 84%, 60%)" : isPos ? "hsl(122, 39%, 49%)" : "#ccc"}`,
            }}
          >
            <p style={{ fontSize: 13, color: "#2a3e2a", lineHeight: 1.6, fontWeight: 500 }}>
              {isNeg ? "⚠️" : isPos ? "✅" : "📋"} {verdict}
            </p>
          </div>
        )}

        {/* Brand watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid hsl(122 39% 49% / 0.15)",
            paddingTop: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4CAF50, #66BB6A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 900,
                color: "white",
              }}
            >
              K
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#2a3e2a", letterSpacing: 1 }}>
                KanKan
              </span>
              <p style={{ fontSize: 9, color: "#8a9e8a", margin: 0 }}>AI 营养透视</p>
            </div>
          </div>
          <p style={{ fontSize: 9, color: "#b0c0b0" }}>长按保存 · 分享给饭友</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
