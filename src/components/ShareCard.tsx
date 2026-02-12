import { forwardRef } from "react";
import type { Locale } from "@/lib/i18n";

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
  locale?: Locale;
}

const BRAND_TEXT: Record<Locale, { tagline: string; lab: string; calLabel: string; proteinLabel: string; fatLabel: string; carbsLabel: string }> = {
  "zh-CN": { tagline: "每 一 口 都 有 据 可 循", lab: "数 字 化 饮 食 实 验 室", calLabel: "热量", proteinLabel: "蛋白质", fatLabel: "脂肪", carbsLabel: "碳水" },
  "en-US": { tagline: "D A T A - D R I V E N   D I N I N G", lab: "Digital Dining Laboratory", calLabel: "Cal", proteinLabel: "Protein", fatLabel: "Fat", carbsLabel: "Carbs" },
};

function MacroRing({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ textAlign: "center", width: 76 }}>
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle
          cx={34} cy={34} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x={34} y={31} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{value}</text>
        <text x={34} y={43} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.45)">{unit}</text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: -2 }}>{label}</div>
    </div>
  );
}

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

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ food, calories, protein_g, fat_g, carbs_g, verdict, roast, ingredients, imageData, score = 60, locale = "zh-CN" }, ref) => {
    const brand = BRAND_TEXT[locale];
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
          background: "#0A0C10",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top: food image */}
        <div style={{
          width: 380, height: Math.round(380 * 9 / 16),
          position: "relative", overflow: "hidden", background: "#111318",
        }}>
          {imageData ? (
            <img src={imageData} alt={food} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0A0C10, #1a1c24)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(10,12,16,0.95) 100%)" }} />
          <div style={{
            position: "absolute", top: 16, right: 16,
            width: 48, height: 48, borderRadius: "50%",
            background: isPos ? "linear-gradient(135deg, #D4AF37, #F5D060)" : isNeg ? "linear-gradient(135deg, #FF5722, #FF8A65)" : "linear-gradient(135deg, #607D8B, #90A4AE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}>
            <span style={{ color: isPos ? "#0A0C10" : "white", fontSize: 16, fontWeight: 900 }}>{score}</span>
          </div>
          <div style={{ position: "absolute", bottom: 16, left: 24, right: 24 }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "white", letterSpacing: -0.5, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{food}</h2>
            <p style={{ fontSize: 12, color: "rgba(160,174,192,0.7)", marginTop: 4 }}>{dateStr}</p>
          </div>
        </div>

        {roast && (
          <div style={{ padding: "20px 24px 0" }}>
            <p style={{
              fontSize: 18, fontWeight: 900, color: "#A0AEC0", lineHeight: 1.5, letterSpacing: -0.3,
              borderLeft: `3px solid #D4AF37`, paddingLeft: 16, textAlign: "left",
            }}>
              "{roast}"
            </p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-around", padding: "20px 16px" }}>
          <MacroRing value={calories} max={2100} color="#D4AF37" label={brand.calLabel} unit="kcal" />
          <MacroRing value={protein_g} max={120} color="#42A5F5" label={brand.proteinLabel} unit="g" />
          <MacroRing value={fat_g} max={58} color="#FFA726" label={brand.fatLabel} unit="g" />
          <MacroRing value={carbs_g} max={263} color="#AB47BC" label={brand.carbsLabel} unit="g" />
        </div>

        {ingredients.length > 0 && (
          <div style={{ padding: "0 24px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ingredients.slice(0, 6).map((item, i) => (
              <span key={i} style={{
                fontSize: 10, background: "rgba(212,175,55,0.08)", color: "rgba(160,174,192,0.7)",
                padding: "4px 10px", borderRadius: 20, fontWeight: 600,
                border: "1px solid rgba(212,175,55,0.15)",
              }}>
                {item.name} {item.grams}g
              </span>
            ))}
          </div>
        )}

        {verdict && (
          <div style={{ padding: "0 24px 20px" }}>
            <p style={{ fontSize: 12, color: "rgba(160,174,192,0.5)", lineHeight: 1.6 }}>
              {isNeg ? "⚠️" : isPos ? "✅" : "📋"} {verdict}
            </p>
          </div>
        )}

        {/* Black-gold brand bar */}
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
                wordBreak: "break-word" as const,
              }}>{brand.tagline}</p>
            </div>
          </div>
          <QRPlaceholder />
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
