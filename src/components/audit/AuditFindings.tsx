import { Microscope } from "lucide-react";
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
}

const AuditFindings = ({ ingredients, hasImage }: AuditFindingsProps) => {
  const totalGl = ingredients.reduce((s, i) => s + i.gl, 0);
  const totalProtein = ingredients.reduce((s, i) => s + i.protein, 0);
  const totalFat = ingredients.reduce((s, i) => s + i.fat, 0);
  const totalFiber = ingredients.reduce((s, i) => s + i.fiber, 0);
  const totalMacro = totalProtein + totalFat + totalFiber || 1;

  const proteinPct = Math.round((totalProtein / totalMacro) * 100);
  const fatPct = Math.round((totalFat / totalMacro) * 100);
  const fiberPct = Math.round((totalFiber / totalMacro) * 100);

  if (!hasImage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full">
        <Microscope className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Awaiting sample input...</p>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          Upload food imagery to begin audit
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Microscope className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-card-foreground tracking-wide">
          AUDIT FINDINGS
        </span>
      </div>

      {/* GL Gauge */}
      <div className="glass rounded-xl p-4 flex flex-col items-center">
        <GLGauge value={totalGl} />
      </div>

      {/* Nutritional Transparency */}
      <div className="glass rounded-xl p-4">
        <NutritionalTransparency protein={proteinPct} fat={fatPct} fiber={fiberPct} />
      </div>

      {/* Ingredient mini-list */}
      {ingredients.length > 0 && (
        <div className="glass rounded-xl p-3 space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
            DETECTED COMPOUNDS
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
