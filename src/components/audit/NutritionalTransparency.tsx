import { useI18n } from "@/lib/i18n";

interface TransparencyItem {
  label: string;
  value: number;
  color: string;
  barColor: string;
}

interface NutritionalTransparencyProps {
  protein: number;
  fat: number;
  fiber: number;
}

const NutritionalTransparency = ({ protein, fat, fiber }: NutritionalTransparencyProps) => {
  const { t } = useI18n();

  const items: TransparencyItem[] = [
    { label: t.auditProteinAsset, value: protein, color: "text-success", barColor: "bg-success" },
    { label: t.auditFatLiability, value: fat, color: "text-destructive", barColor: "bg-destructive" },
    { label: t.auditFiberBuffer, value: fiber, color: "text-primary", barColor: "bg-primary" },
  ];

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
        {t.auditNutritionalTransparency}
      </span>
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-card-foreground">{item.label}</span>
            <span className={`text-xs font-mono font-bold ${item.color}`}>
              {item.value}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.barColor} transition-all duration-1000`}
              style={{ width: `${item.value}%`, opacity: 0.8 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NutritionalTransparency;
