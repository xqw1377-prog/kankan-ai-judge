import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import InputPanel from "@/components/audit/InputPanel";
import AuditFindings, { type DetectedIngredient } from "@/components/audit/AuditFindings";
import SpatialAuditLogs from "@/components/audit/SpatialAuditLogs";

const MOCK_INGREDIENTS: DetectedIngredient[] = [
  { name: "Chicken Breast", grams: 150, gi: 0, gl: 0, oilG: 3.2, protein: 31, fat: 3.6, fiber: 0 },
  { name: "Broccoli", grams: 80, gi: 15, gl: 1.2, oilG: 1.5, protein: 2.8, fat: 0.4, fiber: 2.6 },
  { name: "White Rice", grams: 200, gi: 73, gl: 29.2, oilG: 0, protein: 4.4, fat: 0.4, fiber: 0.6 },
  { name: "Tomato", grams: 60, gi: 15, gl: 0.6, oilG: 0.8, protein: 0.9, fat: 0.2, fiber: 1.2 },
];

const Audit = () => {
  const { t } = useI18n();
  const [images, setImages] = useState<string[]>([]);
  const [ingredients] = useState<DetectedIngredient[]>(MOCK_INGREDIENTS);

  const hasImage = images.length > 0;
  const totalGl = ingredients.reduce((s, i) => s + i.gl, 0);
  const integrityScore = hasImage ? Math.max(0, Math.round(92 - totalGl * 0.3)) : 0;

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-border">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-card-foreground tracking-wide">
          {t.auditWorkspace}
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground">GDAS v1.0</span>
        </div>
      </header>

      {/* Dual-wing body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-4 overflow-y-auto">
        {/* Left Wing: Input Panel */}
        <section className="lg:w-1/2 flex flex-col">
          <InputPanel images={images} onImagesChange={setImages} />
        </section>

        {/* Right Wing: Audit Findings */}
        <section className="lg:w-1/2 flex flex-col">
          <AuditFindings ingredients={hasImage ? ingredients : []} hasImage={hasImage} />
        </section>
      </div>

      {/* Bottom: Spatial Audit Logs */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SpatialAuditLogs integrityScore={integrityScore} hasData={hasImage} />
      </div>
    </div>
  );
};

export default Audit;
