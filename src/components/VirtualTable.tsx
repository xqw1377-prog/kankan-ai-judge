import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import BalanceGauge from "./BalanceGauge";
import BalanceCelebration from "./BalanceCelebration";

interface Ingredient {
  name: string;
  grams: number;
}

interface VirtualTableProps {
  ingredients: Ingredient[];
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  onPortionsChange: (portions: Record<string, number>) => void;
}

const PORTION_OPTIONS = [0.1, 0.25, 0.5, 1];
const FOOD_ICONS = ["🥩", "🥬", "🍚", "🥕", "🍳", "🧄", "🌶️", "🫘", "🥦", "🍅", "🧅", "🥜"];

// Simulate other claimers for demo
function getMockClaims(ingName: string): { avatar: string; pct: number }[] {
  const hash = ingName.charCodeAt(0) % 4;
  if (hash === 0) return [{ avatar: "👩", pct: 0.25 }];
  if (hash === 1) return [{ avatar: "👨", pct: 0.5 }, { avatar: "🧑", pct: 0.25 }];
  return [];
}

function FanSelector({
  open, onSelect, currentPortion, position,
}: {
  open: boolean; onSelect: (p: number) => void; currentPortion: number; position: { x: number; y: number };
}) {
  if (!open) return null;
  return (
    <div className="fixed z-[60] animate-scale-in" style={{ left: position.x, top: position.y, transform: "translate(-50%, -110%)" }}>
      <div className="flex gap-1 glass-strong rounded-2xl px-2 py-1.5 shadow-soft">
        {PORTION_OPTIONS.map((p) => (
          <button key={p} onClick={(e) => { e.stopPropagation(); onSelect(p); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentPortion === p ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-card-foreground hover:bg-secondary"
            }`}
          >
            {Math.round(p * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VirtualTable({
  ingredients, calories, protein_g, fat_g, carbs_g, onPortionsChange,
}: VirtualTableProps) {
  const { t } = useI18n();
  const [portions, setPortions] = useState<Record<string, number>>(() =>
    Object.fromEntries(ingredients.map((ing) => [ing.name, 1]))
  );
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [fanPos, setFanPos] = useState({ x: 0, y: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWeight = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
  const claimedByMe = useMemo(() =>
    ingredients.reduce((sum, ing) => sum + ing.grams * (portions[ing.name] ?? 1), 0),
    [ingredients, portions]
  );
  const othersClaimed = useMemo(() =>
    ingredients.reduce((sum, ing) => {
      const claims = getMockClaims(ing.name);
      return sum + ing.grams * claims.reduce((s, c) => s + c.pct, 0);
    }, 0),
    [ingredients]
  );
  const totalClaimed = claimedByMe + othersClaimed;
  const isBalanced = totalWeight > 0 && Math.abs(totalClaimed / totalWeight - 1) < 0.02;

  // Trigger celebration once when balanced
  useEffect(() => {
    if (isBalanced && !celebrated) {
      setShowCelebration(true);
      setCelebrated(true);
    }
    if (!isBalanced) {
      setCelebrated(false);
    }
  }, [isBalanced, celebrated]);

  const overflowItems = useMemo(() => {
    const items: string[] = [];
    ingredients.forEach(ing => {
      const myPct = portions[ing.name] ?? 1;
      const otherPct = getMockClaims(ing.name).reduce((s, c) => s + c.pct, 0);
      if (myPct + otherPct > 1.01) items.push(ing.name);
    });
    return items;
  }, [ingredients, portions]);

  const totalRatio = useCallback(() => {
    if (totalWeight === 0) return 1;
    return claimedByMe / totalWeight;
  }, [claimedByMe, totalWeight]);

  const claimedCal = Math.round(calories * totalRatio());
  const claimedProtein = Math.round(protein_g * totalRatio() * 10) / 10;
  const claimedFat = Math.round(fat_g * totalRatio() * 10) / 10;
  const claimedCarbs = Math.round(carbs_g * totalRatio() * 10) / 10;

  const handleItemClick = useCallback((name: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFanPos({ x: rect.left + rect.width / 2, y: rect.top });
    setActiveItem((prev) => (prev === name ? null : name));
  }, []);

  const handlePortionSelect = useCallback(
    (name: string, portion: number) => {
      const next = { ...portions, [name]: portion };
      setPortions(next);
      onPortionsChange(next);
      setActiveItem(null);
    },
    [portions, onPortionsChange]
  );

  useEffect(() => {
    const handler = () => setActiveItem(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const radius = 70;
  const centerX = 50;
  const centerY = 50;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.12s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.virtualTable} <span className="flex-1 h-px bg-border" />
      </h3>

      {/* Black-Gold Balance Gauge Dashboard */}
      <div className="glass rounded-2xl p-4 mb-3 shadow-card relative overflow-hidden">
        {isBalanced && (
          <div className="absolute inset-0 pointer-events-none animate-breathe"
            style={{ background: "radial-gradient(ellipse at center, hsl(43 72% 52% / 0.1) 0%, transparent 70%)" }}
          />
        )}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <span className="text-xs text-muted-foreground font-semibold">{t.claimedIntake}</span>
          </div>
          {isBalanced && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-glow-gold"
              style={{ color: "hsl(43, 72%, 55%)", background: "hsl(43 72% 52% / 0.12)", border: "1px solid hsl(43 72% 52% / 0.2)" }}>
              {t.dataBalanced}
            </span>
          )}
        </div>

        <BalanceGauge totalWeight={totalWeight} claimedWeight={totalClaimed} isBalanced={isBalanced} />

        {/* Weight labels */}
        <div className="flex justify-between mt-1 px-2">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground">{t.totalTableWeight}</p>
            <p className="text-xs font-bold text-card-foreground">{totalWeight}g</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground">{t.claimedTotal}</p>
            <p className={`text-xs font-bold ${isBalanced ? "text-glow-gold" : ""}`}
              style={{ color: isBalanced ? "hsl(43, 72%, 55%)" : undefined }}>
              {Math.round(totalClaimed)}g
            </p>
          </div>
        </div>

        {/* Nutrition summary */}
        <div className="flex gap-3 text-xs mt-3 pt-3 border-t border-border">
          <span className="text-primary font-bold">{claimedCal} <span className="text-muted-foreground font-normal">kcal</span></span>
          <span className="text-card-foreground">P {claimedProtein}g</span>
          <span className="text-card-foreground">F {claimedFat}g</span>
          <span className="text-card-foreground">C {claimedCarbs}g</span>
        </div>

        {/* Share button (unlocked when balanced) */}
        {isBalanced && (
          <button className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] animate-fade-in"
            style={{
              background: "linear-gradient(135deg, hsl(43 72% 48%), hsl(43 80% 55%))",
              color: "hsl(220, 20%, 5%)",
              boxShadow: "0 0 20px hsl(43 72% 52% / 0.3)",
            }}
            onClick={() => {/* share handler placeholder */}}
          >
            🏆 {t.shareTableReport}
          </button>
        )}
      </div>

      {/* Overflow warning */}
      {overflowItems.length > 0 && (
        <div className="glass rounded-xl p-3 mb-3 shadow-card border border-destructive/30 animate-pulse-soft">
          <p className="text-xs text-destructive font-semibold flex items-center gap-1">
            ⚠️ {t.portionOverflow}
          </p>
          <p className="text-[10px] text-destructive/70 mt-1">{t.portionOverflowHint}</p>
        </div>
      )}

      {/* Virtual table layout */}
      <div ref={containerRef} className="glass rounded-2xl p-4 shadow-card relative" style={{ minHeight: 200 }}>
        <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
          {/* Table circle */}
          <div className="absolute rounded-full border border-border"
            style={{
              left: "50%", top: "50%", width: 180, height: 180, transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, hsl(220 18% 11%) 0%, hsl(220 18% 8%) 100%)",
            }}
          />
          {/* Center plate */}
          <div className="absolute rounded-full flex items-center justify-center"
            style={{
              left: "50%", top: "50%", width: 50, height: 50, transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, hsl(43 72% 52% / 0.15) 0%, transparent 70%)",
              border: "1px solid hsl(43 72% 52% / 0.2)",
            }}
          >
            <span className="text-lg">🍽️</span>
          </div>

          {/* Ingredient items */}
          {ingredients.slice(0, 8).map((ing, i) => {
            const angle = (i / Math.min(ingredients.length, 8)) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius / 110 * 50);
            const y = centerY + Math.sin(angle) * (radius / 110 * 50);
            const portion = portions[ing.name] ?? 1;
            const isActive = activeItem === ing.name;
            const isPartial = portion < 1;
            const isOverflow = overflowItems.includes(ing.name);
            const claims = getMockClaims(ing.name);

            return (
              <button key={ing.name}
                onClick={(e) => { e.stopPropagation(); handleItemClick(ing.name, e); }}
                className={`absolute flex flex-col items-center transition-all duration-300 ${isActive ? "scale-125 z-20" : "z-10"}`}
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                  isActive ? "ring-2 ring-primary shadow-soft" : ""
                } ${isOverflow ? "ring-2 ring-destructive animate-pulse-soft" : ""}`}
                  style={{
                    background: isActive
                      ? "radial-gradient(circle, hsl(43 72% 52% / 0.25) 0%, hsl(220 18% 12%) 100%)"
                      : "hsl(220 18% 12%)",
                    border: `1px solid ${isOverflow ? "hsl(0 72% 55% / 0.5)" : isActive ? "hsl(43 72% 52% / 0.5)" : "hsl(220 15% 18% / 0.5)"}`,
                    opacity: isPartial ? 0.6 + portion * 0.4 : 1,
                  }}
                >
                  <span className="text-lg">{FOOD_ICONS[i % FOOD_ICONS.length]}</span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-full pointer-events-none animate-pulse-soft"
                      style={{ background: "radial-gradient(circle, hsl(43 72% 52% / 0.3) 0%, transparent 70%)" }}
                    />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 max-w-[50px] truncate leading-none">{ing.name}</span>
                {portion < 1 && (
                  <span className="text-[8px] text-primary font-bold mt-0.5">{Math.round(portion * 100)}%</span>
                )}
                {claims.length > 0 && (
                  <div className="flex -space-x-1 mt-0.5">
                    {claims.map((c, ci) => (
                      <div key={ci} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px]"
                        style={{ background: "hsl(220 18% 15%)", border: "1px solid hsl(220 15% 22%)" }}
                      >
                        {c.avatar}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <FanSelector open={!!activeItem} currentPortion={activeItem ? (portions[activeItem] ?? 1) : 1}
        position={fanPos} onSelect={(p) => activeItem && handlePortionSelect(activeItem, p)}
      />

      <BalanceCelebration show={showCelebration} onDone={() => setShowCelebration(false)} />
    </section>
  );
}
