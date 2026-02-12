import { useState, useCallback } from "react";
import { FlaskConical, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import InputPanel from "@/components/audit/InputPanel";
import AuditFindings, { type DetectedIngredient } from "@/components/audit/AuditFindings";
import SpatialAuditLogs from "@/components/audit/SpatialAuditLogs";

const MOCK_INGREDIENTS: DetectedIngredient[] = [
  { name: "Chicken Breast", grams: 150, gi: 0, gl: 0, oilG: 3.2, protein: 31, fat: 3.6, fiber: 0 },
  { name: "Broccoli", grams: 80, gi: 15, gl: 1.2, oilG: 1.5, protein: 2.8, fat: 0.4, fiber: 2.6 },
  { name: "White Rice", grams: 200, gi: 73, gl: 29.2, oilG: 0, protein: 4.4, fat: 0.4, fiber: 0.6 },
  { name: "Tomato", grams: 60, gi: 15, gl: 0.6, oilG: 0.8, protein: 0.9, fat: 0.2, fiber: 1.2 },
];

const AUDIT_API = "http://192.168.3.101:8080/api/v1/audit/standalone";

const Audit = () => {
  const { t } = useI18n();
  const [images, setImages] = useState<string[]>([]);
  const [ingredients] = useState<DetectedIngredient[]>(MOCK_INGREDIENTS);
  const [auditing, setAuditing] = useState(false);

  const hasImage = images.length > 0;
  const totalGl = ingredients.reduce((s, i) => s + i.gl, 0);
  const integrityScore = hasImage ? Math.max(0, Math.round(92 - totalGl * 0.3)) : 0;

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleGenerateAudit = useCallback(async () => {
    if (!hasImage) {
      toast({ title: t.noImageUploaded, variant: "destructive" });
      return;
    }
    setAuditing(true);
    try {
      const formData = new FormData();
      images.forEach((img, idx) => {
        formData.append("files", dataUrlToBlob(img), `image_${idx}.jpg`);
      });
      const res = await fetch(AUDIT_API, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      console.log("[GDAS] Audit response:", data);
      toast({ title: t.auditComplete });
    } catch (err) {
      console.error("[GDAS] Audit request failed:", err);
      toast({ title: "Audit endpoint unreachable", description: "Using local mock data", variant: "destructive" });
    } finally {
      setAuditing(false);
    }
  }, [hasImage, images, t]);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-border">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-card-foreground tracking-wide">
          {t.auditWorkspace}
        </h1>
        <button
          onClick={handleGenerateAudit}
          disabled={!hasImage || auditing}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${
            hasImage && !auditing
              ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)] active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {auditing ? "TRANSMITTING..." : t.generateAudit}
        </button>
      </header>

      {/* Dual-wing body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-4 overflow-y-auto">
        <section className="lg:w-1/2 flex flex-col">
          <InputPanel images={images} onImagesChange={setImages} />
        </section>
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
