import { FlaskConical, ShieldCheck } from "lucide-react";
import { useNumberRoll } from "@/hooks/useNumberRoll";
interface SpatialAuditLogsProps {
  integrityScore: number; // 0-100
  hasData: boolean;
}

const SpatialAuditLogs = ({ integrityScore, hasData }: SpatialAuditLogsProps) => {
  const displayScore = useNumberRoll(integrityScore, hasData, 1400);
  const scoreColor =
    integrityScore >= 80 ? "text-success" : integrityScore >= 50 ? "text-primary" : "text-destructive";

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary/70" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
            SPATIAL AUDIT LOGS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <FlaskConical className="w-3 h-3 text-primary/40" />
          <span className="text-[9px] font-mono text-muted-foreground">GDAS v1.0</span>
        </div>
      </div>

      {hasData ? (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-card-foreground">Data Integrity Score (DIS)</span>
            <p className="text-[10px] text-muted-foreground">
              Confidence level of this meal's spatial audit
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-2xl font-mono font-bold ${scoreColor}`}>
              {displayScore}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">/100</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No audit data available. Upload an image to begin.
        </p>
      )}

      {hasData && (
        <div className="flex items-center gap-3 pt-1 border-t border-border">
          <div className="flex-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-mono text-muted-foreground">
              Audit timestamp: {new Date().toISOString().slice(0, 19)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpatialAuditLogs;
