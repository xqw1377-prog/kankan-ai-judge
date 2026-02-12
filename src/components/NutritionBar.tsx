interface NutritionBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color?: string;
}

const NutritionBar = ({ label, current, target, unit, color = "bg-primary" }: NutritionBarProps) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOver = current > target;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? "bg-destructive" : color}`}
          style={{
            width: `${pct}%`,
            transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-card-foreground w-20 text-right tabular-nums">
        {Math.round(current)}/{target}{unit}
      </span>
    </div>
  );
};

export default NutritionBar;
