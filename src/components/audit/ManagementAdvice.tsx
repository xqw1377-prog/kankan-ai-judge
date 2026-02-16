import { useMemo } from "react";
import { Stethoscope, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ManagementAdviceProps {
  recommendations: string[];
  visible: boolean;
}

const ManagementAdvice = ({ recommendations, visible }: ManagementAdviceProps) => {
  const { t } = useI18n();

  if (!visible || recommendations.length === 0) return null;

  return (
    <div className="shrink-0 px-4 pt-3 animate-fade-in">
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
            {t.auditManagementAdvice}
          </span>
        </div>
        <div className="space-y-2">
          {recommendations.map((rec, i) => {
            const isRisk =
              rec.includes("风险") ||
              rec.includes("警告") ||
              rec.includes("偏高") ||
              rec.includes("⚠") ||
              rec.includes("过量") ||
              rec.includes("超标");
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 py-2 px-2.5 rounded-lg transition-colors ${
                  isRisk ? "bg-destructive/8 border border-destructive/20" : "bg-secondary/30"
                }`}
              >
                {isRisk ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary" />
                )}
                <span
                  className={`text-xs leading-relaxed ${
                    isRisk ? "text-destructive font-medium" : "text-card-foreground"
                  }`}
                >
                  {rec}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManagementAdvice;
