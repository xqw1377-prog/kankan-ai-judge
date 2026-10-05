import { useState, useMemo } from "react";

interface BrainBatteryProps {
  calories: number;
  fat_g: number;
  carbs_g: number;
  protein_g: number;
  gi_value?: number;
}

const BrainBattery = ({ calories, fat_g, carbs_g, protein_g, gi_value }: BrainBatteryProps) => {
  const [showHedge, setShowHedge] = useState(false);

  const { level, isSurplus } = useMemo(() => {
    let drain = 0;
    if (carbs_g > 60) drain += 15;
    if ((gi_value ?? 55) > 70) drain += 20;
    if (fat_g > 25) drain += 15;
    if (calories > 800) drain += 10;
    if (calories > 1200) drain += 10;
    const proteinBoost = Math.min(10, protein_g * 0.2);
    const level = Math.max(5, Math.min(100, 100 - drain + proteinBoost));
    return { level, isSurplus: level >= 60 };
  }, [calories, fat_g, carbs_g, protein_g, gi_value]);

  const barColor = isSurplus
    ? "hsl(142, 71%, 45%)"
    : level >= 40
      ? "hsl(38, 92%, 50%)"
      : "hsl(0, 72%, 51%)";

  return (
    <div className={`glass rounded-2xl p-4 mb-5 animate-slide-up shadow-card relative overflow-hidden ${
      !isSurplus ? "ring-1 ring-destructive/20" : ""
    }`}>
      {/* Pulsing red overlay for deficit */}
      {!isSurplus && (
        <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            🧠 Brain Battery
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: barColor }}>
            {level}%
          </span>
        </div>

        {/* Battery bar */}
        <div className="h-5 rounded-full bg-secondary/60 overflow-hidden relative border border-border/30">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${level}%`,
              background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
              boxShadow: `0 0 12px ${barColor}40`,
            }}
          />
          {/* Battery segments */}
          <div className="absolute inset-0 flex">
            {[20, 40, 60, 80].map(p => (
              <div key={p} className="h-full border-r border-background/20" style={{ marginLeft: `${p}%`, position: "absolute", left: 0 }} />
            ))}
          </div>
        </div>

        {/* Status text */}
        <div className="mt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">没有测到专注或决策表现的变化。</p>
        </div>

        {/* Hedge button for deficit */}
        {!isSurplus && (
          <div className="mt-3">
            {!showHedge ? (
              <button
                onClick={() => setShowHedge(true)}
                className="w-full py-2 rounded-xl text-xs font-bold border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-all active:scale-[0.98]"
              >
                🛡 资产救市 (Hedge)
              </button>
            ) : (
              <div className="bg-secondary/60 rounded-xl p-3 border border-border/30 animate-fade-in space-y-2">
                <p className="text-[10px] font-bold text-card-foreground">🔧 对冲方案</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-sm">💧</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      可以喝水。这不是测到的效果。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🚶</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      可以走动。这不是测到的效果。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🧘</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      可以休息。这不是测到的效果。
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHedge(false)}
                  className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
                >
                  收起
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrainBattery;
