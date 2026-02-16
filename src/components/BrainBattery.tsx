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

  const { level, isSurplus, focusMin, crashTime, dropPct } = useMemo(() => {
    // Base battery 100%. Deductions: high sugar (carbs>60 or gi>70), high fat (fat>25), high cal (>800)
    let drain = 0;
    if (carbs_g > 60) drain += 15;
    if ((gi_value ?? 55) > 70) drain += 20;
    if (fat_g > 25) drain += 15;
    if (calories > 800) drain += 10;
    if (calories > 1200) drain += 10;
    // Protein bonus
    const proteinBoost = Math.min(10, protein_g * 0.2);
    const level = Math.max(5, Math.min(100, 100 - drain + proteinBoost));
    const isSurplus = level >= 60;
    const focusMin = Math.round(level * 3); // up to 300min
    const now = new Date();
    const crashHour = now.getHours() + Math.round(level / 30);
    const crashTime = `${Math.min(23, crashHour)}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dropPct = Math.round((100 - level) * 0.6);
    return { level, isSurplus, focusMin, crashTime, dropPct };
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
          {isSurplus ? (
            <p className="text-xs font-semibold text-success leading-relaxed">
              🟢 今日生理性能处于牛市，专注力预计增值 <span className="font-mono font-bold">{focusMin}min</span>。
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold text-destructive leading-relaxed animate-pulse">
                🔴 当前处于生理空头，下午 <span className="font-mono font-bold">{crashTime}</span> 存在宕机风险，建议立即补救。
              </p>
              <p className="text-[9px] font-mono text-destructive/70 mt-1">
                决策性能将下降 {dropPct}% · 预计高效时长减少 2h
              </p>
            </>
          )}
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
                      立即补充 <span className="font-bold text-primary">500ml 水</span>，可稀释血糖峰值，挽回 <span className="font-bold text-success">~15%</span> 损耗
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🚶</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      进行 <span className="font-bold text-primary">10 分钟快走</span>，加速葡萄糖利用，挽回 <span className="font-bold text-success">~30%</span> 损耗
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🧘</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-primary">5 分钟深呼吸</span>，降低皮质醇，恢复专注力基线
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
