import { useState, useEffect } from "react";
import { Microscope } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import GLGauge from "./GLGauge";
import NutritionalTransparency from "./NutritionalTransparency";

interface DetectedIngredient {
  name: string;
  grams: number;
  gi: number;
  gl: number;
  oilG: number;
  protein: number;
  fat: number;
  fiber: number;
}

interface AuditFindingsProps {
  ingredients: DetectedIngredient[];
  hasImage: boolean;
  auditing?: boolean;
}

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

const AuditFindings = ({ ingredients, hasImage, auditing }: AuditFindingsProps) => {
  const { t } = useI18n();
  const [jumpValues, setJumpValues] = useState({ gl: 0, protein: 0, fat: 0, fiber: 0 });

  useEffect(() => {
    if (!auditing) return;
    const interval = setInterval(() => {
      setJumpValues({
        gl: rand(5, 50),
        protein: rand(10, 70),
        fat: rand(10, 60),
        fiber: rand(5, 40),
      });
    }, 150);
    return () => clearInterval(interval);
  }, [auditing]);

  const totalGl = ingredients.reduce((s, i) => s + i.gl, 0);
  const totalProtein = ingredients.reduce((s, i) => s + i.protein, 0);
  const totalFat = ingredients.reduce((s, i) => s + i.fat, 0);
  const totalFiber = ingredients.reduce((s, i) => s + i.fiber, 0);
  const totalMacro = totalProtein + totalFat + totalFiber || 1;

  const proteinPct = Math.round((totalProtein / totalMacro) * 100);
  const fatPct = Math.round((totalFat / totalMacro) * 100);
  const fiberPct = Math.round((totalFiber / totalMacro) * 100);

  const displayGl = auditing ? jumpValues.gl : totalGl;
  const displayProtein = auditing ? jumpValues.protein : proteinPct;
  const displayFat = auditing ? jumpValues.fat : fatPct;
  const displayFiber = auditing ? jumpValues.fiber : fiberPct;

  if (!hasImage && !auditing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full">
        <Microscope className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t.auditAwaitingSample}</p>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {t.auditUploadHint}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Microscope className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-card-foreground tracking-wide">
          {auditing ? t.auditComputing : t.auditFindings}
        </span>
      </div>

      <div className="glass rounded-xl p-4 flex flex-col items-center animate-result-in" style={{ animationDelay: "0.1s", opacity: auditing ? 1 : 0 }}>
        <GLGauge value={displayGl} />
      </div>

      <div className="glass rounded-xl p-4 animate-result-in" style={{ animationDelay: "0.3s", opacity: auditing ? 1 : 0 }}>
        <NutritionalTransparency protein={displayProtein} fat={displayFat} fiber={displayFiber} />
      </div>

      {ingredients.length > 0 && !auditing && (
        <div className="glass rounded-xl p-3 space-y-1.5 animate-result-in" style={{ animationDelay: "0.5s", opacity: 0 }}>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
            {t.auditDetectedCompounds}
          </span>
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
              <span className="text-[11px] text-card-foreground truncate max-w-[140px]">{ing.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-muted-foreground">{ing.grams}g</span>
                <span className={`text-[9px] font-mono ${ing.gl > 15 ? "text-destructive" : "text-success"}`}>
                  GL {ing.gl.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditFindings;
export type { DetectedIngredient };
