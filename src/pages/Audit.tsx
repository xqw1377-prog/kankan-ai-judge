import { useState, useCallback, useRef } from "react";
import { FlaskConical, Zap, ImagePlus, WifiOff, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import InputPanel from "@/components/audit/InputPanel";
import AuditFindings, { type DetectedIngredient } from "@/components/audit/AuditFindings";
import SpatialAuditLogs from "@/components/audit/SpatialAuditLogs";
import UploadDialog from "@/components/audit/UploadDialog";
import { Progress } from "@/components/ui/progress";

const MOCK_INGREDIENTS: DetectedIngredient[] = [
  { name: "Chicken Breast", grams: 150, gi: 0, gl: 0, oilG: 3.2, protein: 31, fat: 3.6, fiber: 0 },
  { name: "Broccoli", grams: 80, gi: 15, gl: 1.2, oilG: 1.5, protein: 2.8, fat: 0.4, fiber: 2.6 },
  { name: "White Rice", grams: 200, gi: 73, gl: 29.2, oilG: 0, protein: 4.4, fat: 0.4, fiber: 0.6 },
  { name: "Tomato", grams: 60, gi: 15, gl: 0.6, oilG: 0.8, protein: 0.9, fat: 0.2, fiber: 1.2 },
];

const AUDIT_API = "http://192.168.3.101:8080/api/v1/audit/standalone";

const AUDIT_PHASES = [
  "Initializing GDAS engine...",
  "Analyzing pixel density matrix...",
  "Detecting hidden oil signatures...",
  "Computing glycemic load vectors...",
  "Generating audit report...",
];

const Audit = () => {
  const { t } = useI18n();
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<DetectedIngredient[]>([]);
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditPhase, setAuditPhase] = useState(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [engineOffline, setEngineOffline] = useState(false);

  const hasImage = images.length > 0;
  const displayIngredients = auditComplete ? ingredients : [];
  const totalGl = displayIngredients.reduce((s, i) => s + i.gl, 0);
  const integrityScore = auditComplete ? Math.max(0, Math.round(92 - totalGl * 0.3)) : 0;

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const runAuditAnimation = (): Promise<void> => {
    return new Promise((resolve) => {
      setAuditProgress(0);
      setAuditPhase(0);
      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 4 + 1.5;
        if (p >= 100) {
          p = 100;
          clearInterval(timer);
          setTimeout(resolve, 300);
        }
        setAuditProgress(Math.min(100, p));
        setAuditPhase(Math.min(AUDIT_PHASES.length - 1, Math.floor((p / 100) * AUDIT_PHASES.length)));
      }, 100);
    });
  };

  const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImages((prev) => [...prev.slice(-4), result]);
      setAuditComplete(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerateAudit = useCallback(async () => {
    if (!hasImage) {
      toast({ title: t.noImageUploaded, variant: "destructive" });
      return;
    }
    setAuditing(true);
    setAuditComplete(false);

    // Run 3-second animation in parallel with API call
    const [apiResult] = await Promise.allSettled([
      (async () => {
        const formData = new FormData();
        images.forEach((img, idx) => {
          formData.append("files", dataUrlToBlob(img), `image_${idx}.jpg`);
        });
        const res = await fetch(AUDIT_API, { method: "POST", body: formData });
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })(),
      runAuditAnimation(),
    ]);

    if (apiResult.status === "fulfilled") {
      const data = apiResult.value;
      console.log("[GDAS] Audit response:", data);
      setEngineOffline(false);
      if (data?.ingredients && Array.isArray(data.ingredients)) {
        setIngredients(
          data.ingredients.map((item: any) => ({
            name: item.name || "Unknown",
            grams: item.grams ?? item.weight ?? 0,
            gi: item.gi ?? 0,
            gl: item.gl ?? 0,
            oilG: item.oil_g ?? item.oilG ?? 0,
            protein: item.protein ?? 0,
            fat: item.fat ?? 0,
            fiber: item.fiber ?? 0,
          }))
        );
      } else {
        setIngredients(MOCK_INGREDIENTS);
      }
      toast({ title: t.auditComplete });
    } else {
      console.error("[GDAS] Audit request failed:", apiResult.reason);
      setEngineOffline(true);
      setIngredients(MOCK_INGREDIENTS);
      toast({ title: "Engine Offline", description: "Using local mock data", variant: "destructive" });
    }

    setAuditComplete(true);
    setAuditing(false);
  }, [hasImage, images, t]);

  const handleDialogFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImages((prev) => [...prev.slice(-4), result]);
        setAuditComplete(false);
        setEngineOffline(false);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Only open dialog when clicking on background/empty areas, not on buttons/inputs/interactive elements
    if (target.closest("button, input, a, [role='button'], .glass, .glass-strong, img")) return;
    setUploadDialogOpen(true);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto" onClick={handleBackgroundClick}>
      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFilesSelected={handleDialogFiles}
        imageCount={images.length}
      />

      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-border">
        {/* Quick file picker */}
        <button
          onClick={() => quickInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 bg-secondary/60 text-primary transition-all active:scale-95"
          aria-label="Quick upload"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[10px] font-mono tracking-wider hidden sm:inline">
            {hasImage ? `${images.length} IMG` : "ADD"}
          </span>
        </button>
        <input
          ref={quickInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleQuickUpload}
        />

        <FlaskConical className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-card-foreground tracking-wide">
          {t.auditWorkspace}
        </h1>

        {/* Scan New Meal button */}
        <button
          onClick={() => setUploadDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold tracking-wider transition-all active:scale-95"
        >
          <ScanLine className="w-3.5 h-3.5" />
          Scan New Meal
        </button>

        {/* Engine offline indicator */}
        {engineOffline && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/30 animate-fade-in">
            <WifiOff className="w-3 h-3 text-destructive" />
            <span className="text-[9px] font-mono text-destructive tracking-wider">
              Engine Offline — Check 8080
            </span>
          </div>
        )}

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
          {auditing ? "AUDITING..." : t.generateAudit}
        </button>
      </header>

      {/* Audit progress overlay */}
      {auditing && (
        <div className="shrink-0 px-4 py-3 border-b border-primary/20 bg-primary/5 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-primary animate-pulse tracking-widest">
              {AUDIT_PHASES[auditPhase]}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {Math.round(auditProgress)}%
            </span>
          </div>
          <Progress value={auditProgress} className="h-1.5 bg-secondary" />
        </div>
      )}

      {/* Dual-wing body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-4 overflow-y-auto">
        <section className="lg:w-1/2 flex flex-col">
          <InputPanel images={images} onImagesChange={(imgs) => { setImages(imgs); setAuditComplete(false); }} />
        </section>
        <section className="lg:w-1/2 flex flex-col">
          <AuditFindings ingredients={displayIngredients} hasImage={auditComplete} />
        </section>
      </div>

      {/* Bottom: Spatial Audit Logs */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SpatialAuditLogs integrityScore={integrityScore} hasData={auditComplete} />
      </div>
    </div>
  );
};

export default Audit;
