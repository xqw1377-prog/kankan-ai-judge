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
  imageData?: string;
  score?: number;
}

function MacroRing({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ textAlign: "center", width: 76 }}>
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
        <circle
          cx={34} cy={34} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x={34} y={31} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{value}</text>
        <text x={34} y={43} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.6)">{unit}</text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: -2 }}>{label}</div>
    </div>
  );
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ food, calories, protein_g, fat_g, carbs_g, verdict, roast, ingredients, imageData, score = 60 }, ref) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const isNeg = score < 50;
    const isPos = score >= 80;

    return (
      <div
        ref={ref}
        style={{
          width: 380,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
          background: "#1a1a1a",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top: food image or gradient hero */}
        <div style={{
          height: 200,
          background: imageData ? `url(${imageData}) center/cover` : "linear-gradient(135deg, #2e7d32, #4CAF50)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 30%, rgba(26,26,26,0.95) 100%)",
          }} />
          {/* Score badge */}
          <div style={{
            position: "absolute", top: 16, right: 16,
            width: 48, height: 48, borderRadius: "50%",
            background: isPos ? "linear-gradient(135deg, #4CAF50, #81C784)" : isNeg ? "linear-gradient(135deg, #FF5722, #FF8A65)" : "linear-gradient(135deg, #9E9E9E, #BDBDBD)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}>
            <span style={{ color: "white", fontSize: 16, fontWeight: 900 }}>{score}</span>
          </div>
          {/* Food name overlay */}
          <div style={{ position: "absolute", bottom: 16, left: 24, right: 24 }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "white", letterSpacing: -0.5, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {food}
            </h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{dateStr}</p>
          </div>
        </div>

        {/* Roast - magazine headline */}
        {roast && (
          <div style={{ padding: "20px 24px 0" }}>
            <p style={{
              fontSize: 18, fontWeight: 900, color: "white", lineHeight: 1.5,
              letterSpacing: -0.3,
              borderLeft: `3px solid ${isPos ? "#4CAF50" : isNeg ? "#FF5722" : "#9E9E9E"}`,
              paddingLeft: 16,
              textAlign: "left",
            }}>
              "{roast}"
            </p>
          </div>
        )}

        {/* Macro ring charts on dark bg */}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "20px 16px" }}>
          <MacroRing value={calories} max={2100} color="#66BB6A" label="热量" unit="kcal" />
          <MacroRing value={protein_g} max={120} color="#42A5F5" label="蛋白质" unit="g" />
          <MacroRing value={fat_g} max={58} color="#FFA726" label="脂肪" unit="g" />
          <MacroRing value={carbs_g} max={263} color="#AB47BC" label="碳水" unit="g" />
        </div>

        {/* Ingredients pills */}
        {ingredients.length > 0 && (
          <div style={{ padding: "0 24px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ingredients.slice(0, 6).map((item, i) => (
              <span key={i} style={{
                fontSize: 10, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                padding: "4px 10px", borderRadius: 20, fontWeight: 600,
              }}>
                {item.name} {item.grams}g
              </span>
            ))}
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div style={{ padding: "0 24px 20px" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              {isNeg ? "⚠️" : isPos ? "✅" : "📋"} {verdict}
            </p>
          </div>
        )}

        {/* Black-gold brand bar */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
          borderTop: "1px solid rgba(212,175,55,0.3)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #D4AF37, #F5D060)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#1a1a1a",
            }}>K</div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#D4AF37", letterSpacing: 2 }}>KANKAN AI</span>
              <p style={{ fontSize: 8, color: "rgba(212,175,55,0.6)", margin: 0, letterSpacing: 1 }}>5年1000店计划 · 数字化饮食实验室</p>
            </div>
          </div>
          {/* QR placeholder */}
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            border: "1px solid rgba(212,175,55,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 8, color: "rgba(212,175,55,0.5)", fontWeight: 700 }}>QR</span>
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
