import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

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

function FanSelector({
  open,
  onSelect,
  currentPortion,
  position,
}: {
  open: boolean;
  onSelect: (p: number) => void;
  currentPortion: number;
  position: { x: number; y: number };
}) {
  if (!open) return null;

  return (
    <div
      className="fixed z-[60] animate-scale-in"
      style={{ left: position.x, top: position.y, transform: "translate(-50%, -110%)" }}
    >
      <div className="flex gap-1 glass-strong rounded-2xl px-2 py-1.5 shadow-soft">
        {PORTION_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={(e) => { e.stopPropagation(); onSelect(p); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentPortion === p
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-card-foreground hover:bg-secondary"
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
  ingredients,
  calories,
  protein_g,
  fat_g,
  carbs_g,
  onPortionsChange,
}: VirtualTableProps) {
  const { t } = useI18n();
  const [portions, setPortions] = useState<Record<string, number>>(() =>
    Object.fromEntries(ingredients.map((ing) => [ing.name, 1]))
  );
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [fanPos, setFanPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const totalRatio = useCallback(() => {
    const total = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    if (total === 0) return 1;
    return ingredients.reduce((sum, ing) => sum + ing.grams * (portions[ing.name] ?? 1), 0) / total;
  }, [ingredients, portions]);

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

  // Circular table layout
  const radius = 70;
  const centerX = 50;
  const centerY = 50;

  return (
    <section className="mb-5 animate-slide-up" style={{ animationDelay: "0.12s" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-8 h-px bg-border" /> {t.virtualTable} <span className="flex-1 h-px bg-border" />
      </h3>

      {/* Today's claimed intake summary */}
      <div className="glass rounded-xl p-3 mb-3 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-semibold">{t.claimedIntake}</span>
          <div className="flex gap-3 text-xs">
            <span className="text-primary font-bold">{claimedCal} <span className="text-muted-foreground font-normal">kcal</span></span>
            <span className="text-card-foreground">P {claimedProtein}g</span>
            <span className="text-card-foreground">F {claimedFat}g</span>
            <span className="text-card-foreground">C {claimedCarbs}g</span>
          </div>
        </div>
      </div>

      {/* Virtual table layout */}
      <div ref={containerRef} className="glass rounded-2xl p-4 shadow-card relative" style={{ minHeight: 200 }}>
        {/* Table surface */}
        <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
          {/* Table circle */}
          <div
            className="absolute rounded-full border border-border"
            style={{
              left: "50%",
              top: "50%",
              width: 180,
              height: 180,
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, hsl(220 18% 11%) 0%, hsl(220 18% 8%) 100%)",
            }}
          />

          {/* Center plate */}
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: "50%",
              top: "50%",
              width: 50,
              height: 50,
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, hsl(43 72% 52% / 0.15) 0%, transparent 70%)",
              border: "1px solid hsl(43 72% 52% / 0.2)",
            }}
          >
            <span className="text-lg">🍽️</span>
          </div>

          {/* Ingredient items around the table */}
          {ingredients.slice(0, 8).map((ing, i) => {
            const angle = (i / Math.min(ingredients.length, 8)) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius / 110 * 50);
            const y = centerY + Math.sin(angle) * (radius / 110 * 50);
            const portion = portions[ing.name] ?? 1;
            const isActive = activeItem === ing.name;
            const isPartial = portion < 1;

            return (
              <button
                key={ing.name}
                onClick={(e) => { e.stopPropagation(); handleItemClick(ing.name, e); }}
                className={`absolute flex flex-col items-center transition-all duration-300 ${
                  isActive ? "scale-125 z-20" : "z-10"
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                    isActive ? "ring-2 ring-primary shadow-soft" : ""
                  }`}
                  style={{
                    background: isActive
                      ? "radial-gradient(circle, hsl(43 72% 52% / 0.25) 0%, hsl(220 18% 12%) 100%)"
                      : "hsl(220 18% 12%)",
                    border: `1px solid ${isActive ? "hsl(43 72% 52% / 0.5)" : "hsl(220 15% 18% / 0.5)"}`,
                    opacity: isPartial ? 0.6 + portion * 0.4 : 1,
                  }}
                >
                  <span className="text-lg">{FOOD_ICONS[i % FOOD_ICONS.length]}</span>
                  {/* Gold shimmer on active */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none animate-pulse-soft"
                      style={{
                        background: "radial-gradient(circle, hsl(43 72% 52% / 0.3) 0%, transparent 70%)",
                      }}
                    />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 max-w-[50px] truncate leading-none">
                  {ing.name}
                </span>
                {portion < 1 && (
                  <span className="text-[8px] text-primary font-bold mt-0.5">
                    {Math.round(portion * 100)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fan selector popup */}
      <FanSelector
        open={!!activeItem}
        currentPortion={activeItem ? (portions[activeItem] ?? 1) : 1}
        position={fanPos}
        onSelect={(p) => activeItem && handlePortionSelect(activeItem, p)}
      />
    </section>
  );
}
