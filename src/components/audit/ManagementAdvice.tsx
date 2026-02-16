import { Stethoscope, AlertTriangle, Footprints, Leaf, Dumbbell } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type RiskLevel = "safe" | "caution" | "danger";

interface ManagementAdviceProps {
  recommendations: string[];
  visible: boolean;
  bpiScore: number;
}

const ACTION_TAGS_ZH = [
  { icon: Footprints, text: "建议餐后快走15分钟" },
  { icon: Leaf, text: "下一餐增加深色蔬菜" },
  { icon: Dumbbell, text: "今日可增加轻度拉伸" },
];

const ACTION_TAGS_EN = [
  { icon: Footprints, text: "Walk 15 min after meal" },
  { icon: Leaf, text: "Add dark vegetables next meal" },
  { icon: Dumbbell, text: "Light stretching today" },
];

const detectRiskLevel = (rec: string): RiskLevel => {
  const dangerWords = ["禁忌", "严重", "危险", "超标", "极高", "过量", "risk", "danger"];
  const cautionWords = ["风险", "警告", "偏高", "注意", "⚠", "建议减少", "caution", "warning"];
  if (dangerWords.some((w) => rec.toLowerCase().includes(w))) return "danger";
  if (cautionWords.some((w) => rec.toLowerCase().includes(w))) return "caution";
  return "safe";
};

const riskStyles: Record<RiskLevel, { bg: string; border: string; text: string; dot: string }> = {
  safe: {
    bg: "bg-[hsl(160_60%_45%/0.08)]",
    border: "border-[hsl(160_60%_45%/0.25)]",
    text: "text-[hsl(160_60%_55%)]",
    dot: "bg-[hsl(160_60%_45%)]",
  },
  caution: {
    bg: "bg-[hsl(var(--warning)/0.08)]",
    border: "border-[hsl(var(--warning)/0.3)]",
    text: "text-[hsl(var(--warning))]",
    dot: "bg-[hsl(var(--warning))]",
  },
  danger: {
    bg: "bg-destructive/8",
    border: "border-destructive/25",
    text: "text-destructive",
    dot: "bg-destructive",
  },
};

const ManagementAdvice = ({ recommendations, visible, bpiScore }: ManagementAdviceProps) => {
  const { t } = useI18n();

  if (!visible || recommendations.length === 0) return null;

  // Overall risk from BPI
  const overallRisk: RiskLevel = bpiScore >= 60 ? "safe" : bpiScore >= 35 ? "caution" : "danger";
  const overallStyle = riskStyles[overallRisk];

  // Pick action tags based on risk
  const isZh = t.appName === "KANKAN" && t.cancel === "取消";
  const actionTags = isZh ? ACTION_TAGS_ZH : ACTION_TAGS_EN;
  const selectedActions = overallRisk === "safe" ? [actionTags[2]] : overallRisk === "caution" ? [actionTags[0], actionTags[1]] : actionTags;

  return (
    <div className="shrink-0 px-4 pt-3 animate-fade-in">
      <div className={`rounded-xl p-4 space-y-3 glass ${overallStyle.bg} border ${overallStyle.border}`}>
        {/* Header with risk indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className={`w-4 h-4 ${overallStyle.text}`} />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              {t.auditManagementAdvice}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider ${overallStyle.bg} ${overallStyle.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${overallStyle.dot} ${overallRisk !== "safe" ? "animate-pulse" : ""}`} />
            {overallRisk === "safe" ? (isZh ? "正常" : "NORMAL") : overallRisk === "caution" ? (isZh ? "偏离目标" : "CAUTION") : (isZh ? "风险预警" : "DANGER")}
          </div>
        </div>

        {/* Primary advice - first recommendation highlighted */}
        <div className={`rounded-lg p-3 ${overallStyle.bg} border ${overallStyle.border}`}>
          <p className={`text-sm font-bold leading-relaxed ${overallStyle.text}`}>
            {recommendations[0]}
          </p>
        </div>

        {/* Secondary recommendations */}
        {recommendations.length > 1 && (
          <div className="space-y-1.5">
            {recommendations.slice(1).map((rec, i) => {
              const risk = detectRiskLevel(rec);
              const style = riskStyles[risk];
              return (
                <div key={i} className={`flex items-start gap-2.5 py-2 px-2.5 rounded-lg ${style.bg} border ${style.border}`}>
                  {risk === "danger" ? (
                    <AlertTriangle className={`w-3.5 h-3.5 ${style.text} mt-0.5 shrink-0`} />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                  )}
                  <span className={`text-xs leading-relaxed ${risk !== "safe" ? `${style.text} font-medium` : "text-card-foreground"}`}>
                    {rec}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedActions.map((action, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border/30">
              <action.icon className="w-3 h-3 text-primary/70" />
              <span className="text-[10px] font-mono text-muted-foreground">{action.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagementAdvice;
