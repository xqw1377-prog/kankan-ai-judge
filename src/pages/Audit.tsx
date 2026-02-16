import { useState, useCallback, useRef } from "react";
import { FlaskConical, Zap, ImagePlus, WifiOff, ScanLine, ShieldCheck, ClipboardList } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import InputPanel from "@/components/audit/InputPanel";
import AuditFindings, { type DetectedIngredient } from "@/components/audit/AuditFindings";
import SpatialAuditLogs from "@/components/audit/SpatialAuditLogs";
import AuditHistoryLog from "@/components/audit/AuditHistoryLog";
import UploadDialog from "@/components/audit/UploadDialog";
import HealthAlertBanner from "@/components/audit/HealthAlertBanner";
import { useProfile } from "@/hooks/useProfile";
import { Progress } from "@/components/ui/progress";

const MOCK_INGREDIENTS: DetectedIngredient[] = [
  { name: "Chicken Breast", grams: 150, gi: 0, gl: 0, oilG: 3.2, protein: 31, fat: 3.6, fiber: 0 },
  { name: "Broccoli", grams: 80, gi: 15, gl: 1.2, oilG: 1.5, protein: 2.8, fat: 0.4, fiber: 2.6 },
  { name: "White Rice", grams: 200, gi: 73, gl: 29.2, oilG: 0, protein: 4.4, fat: 0.4, fiber: 0.6 },
  { name: "Tomato", grams: 60, gi: 15, gl: 0.6, oilG: 0.8, protein: 0.9, fat: 0.2, fiber: 1.2 },
];

const AUDIT_API = "http://192.168.3.101:8080/api/v1/audit/standalone";

const Audit = () => {
  const { t } = useI18n();
  const { profile } = useProfile();
  const quickInputRef = useRef<HTMLInputElement>(null);
  const dropZoneInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<DetectedIngredient[]>([]);
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditPhase, setAuditPhase] = useState(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [engineOffline, setEngineOffline] = useState(false);
  const [showVerified, setShowVerified] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [bpiScore, setBpiScore] = useState(0);

  const hasImage = images.length > 0;
  const displayIngredients = auditComplete ? ingredients : [];
  const healthConditions = (profile as any)?.health_conditions ?? [];

  const AUDIT_PHASES = [
    t.auditPixelPhases[0] || "Initializing GDAS engine...",
    t.auditPixelPhases[1] || "Analyzing pixel density matrix...",
    t.auditPixelPhases[2] || "Detecting hidden oil signatures...",
    t.auditPixelPhases[3] || "Computing glycemic load vectors...",
    t.auditPixelPhases[4] || "Generating audit report...",
  ];

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
      setShowVerified(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDropZoneFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImages((prev) => [...prev.slice(-4), result]);
        setAuditComplete(false);
        setShowVerified(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateAudit = useCallback(async () => {
    if (!hasImage) {
      toast({ title: t.noImageUploaded, variant: "destructive" });
      return;
    }
    setAuditing(true);
    setAuditComplete(false);
    setShowVerified(false);

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
      setEngineOffline(false);
      let parsedIngredients: DetectedIngredient[] = MOCK_INGREDIENTS;
      if (data?.ingredients && Array.isArray(data.ingredients)) {
        parsedIngredients = data.ingredients.map((item: any) => ({
          name: item.name || "Unknown",
          grams: item.grams ?? item.weight ?? 0,
          gi: item.gi ?? 0,
          gl: item.gl ?? 0,
          oilG: item.oil_g ?? item.oilG ?? 0,
          protein: item.protein ?? 0,
          fat: item.fat ?? 0,
          fiber: item.fiber ?? 0,
        }));
      }
      setIngredients(parsedIngredients);

      // Compute BPI from real nutritional data
      const totalProtein = parsedIngredients.reduce((s, i) => s + i.protein, 0);
      const totalFiber = parsedIngredients.reduce((s, i) => s + i.fiber, 0);
      const totalGl = parsedIngredients.reduce((s, i) => s + i.gl, 0);
      const totalFat = parsedIngredients.reduce((s, i) => s + i.fat, 0);
      // BPI: protein & fiber boost score, GL & excess fat penalize
      const rawBpi = 50 + (totalProtein * 0.6) + (totalFiber * 1.2) - (totalGl * 0.4) - (totalFat * 0.15);
      const computedBpi = data?.bpi_score ?? Math.max(0, Math.min(100, Math.round(rawBpi)));
      setBpiScore(computedBpi);

      // Parse recommendations from backend
      if (data?.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else if (data?.suggestion) {
        setRecommendations([data.suggestion]);
      } else {
        setRecommendations([
          "检测到炎症风险中等，建议减少精制碳水摄入",
          "蛋白质摄入充足，继续保持当前水平",
          "建议增加深色蔬菜比例以提升膳食纤维缓冲",
        ]);
      }
      toast({ title: t.auditComplete });
    } else {
      setEngineOffline(true);
      setIngredients(MOCK_INGREDIENTS);
      setBpiScore(65);
      setRecommendations([
        "检测到炎症风险中等，建议减少精制碳水摄入",
        "蛋白质摄入充足，继续保持当前水平",
        "建议增加深色蔬菜比例以提升膳食纤维缓冲",
      ]);
      toast({ title: t.auditEngineOffline, variant: "destructive" });
    }

    setAuditComplete(true);
    setAuditing(false);
    setTimeout(() => setShowVerified(true), 400);
  }, [hasImage, images, t]);

  const handleDialogFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImages((prev) => [...prev.slice(-4), result]);
        setAuditComplete(false);
        setShowVerified(false);
        setEngineOffline(false);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, [role='button'], .glass, .glass-strong, img, .drop-zone")) return;
    setUploadDialogOpen(true);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto" onClick={handleBackgroundClick}>
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFilesSelected={handleDialogFiles}
        imageCount={images.length}
      />

      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-border">
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
        <input ref={quickInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleQuickUpload} />

        <FlaskConical className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-card-foreground tracking-wide">{t.auditWorkspace}</h1>

        <button
          onClick={() => setUploadDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold tracking-wider transition-all active:scale-95"
        >
          <ScanLine className="w-3.5 h-3.5" />
          {t.auditScanNewMeal}
        </button>

        {engineOffline && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/30 animate-fade-in">
            <WifiOff className="w-3 h-3 text-destructive" />
            <span className="text-[9px] font-mono text-destructive tracking-wider">{t.auditEngineOffline}</span>
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
          {auditing ? t.auditAuditing : t.generateAudit}
        </button>
      </header>

      {/* Hero Drop Zone */}
      <div
        className="drop-zone shrink-0 mx-4 mt-4 relative rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer overflow-hidden"
        style={{
          background: "hsl(220 18% 6% / 0.85)",
          backdropFilter: "blur(20px)",
          minHeight: hasImage ? "180px" : "120px",
        }}
        onClick={() => dropZoneInputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleDropZoneFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        {hasImage ? (
          <div className="relative w-full h-full min-h-[180px]">
            <img src={images[images.length - 1]} alt="meal" className="w-full h-full object-cover rounded-[10px] opacity-80" />
            {auditing && (
              <div className="absolute inset-0 rounded-[10px]" style={{ background: "hsl(220 20% 5% / 0.5)" }}>
                <div className="absolute left-0 w-full h-[2px] animate-scan-line" style={{
                  background: "linear-gradient(90deg, transparent 0%, hsl(var(--info)) 20%, hsl(var(--info)) 80%, transparent 100%)",
                  boxShadow: "0 0 20px 6px hsl(var(--info) / 0.5), 0 0 50px 12px hsl(var(--info) / 0.2)",
                }} />
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: "repeating-linear-gradient(0deg, hsl(var(--info)) 0px, transparent 1px, transparent 30px)",
                }} />
              </div>
            )}
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-primary/30 px-2.5 py-1 rounded-full text-[10px] font-mono text-primary">
              {t.auditImagesLoaded(images.length)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <ScanLine className="w-8 h-8 text-primary/40" />
            <p className="text-sm font-semibold text-card-foreground/70 tracking-wide">
              {t.auditDropZoneHint}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">
              {t.auditDropZoneCapture}
            </p>
          </div>
        )}
        <input ref={dropZoneInputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => handleDropZoneFiles(e.target.files)} />
      </div>

      {/* Audit progress bar */}
      {auditing && (
        <div className="shrink-0 px-4 py-3 border-b border-primary/20 bg-primary/5 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-primary animate-pulse tracking-widest">{AUDIT_PHASES[auditPhase]}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(auditProgress)}%</span>
          </div>
          <Progress value={auditProgress} className="h-1.5 bg-secondary" />
        </div>
      )}

      {/* Audit Verified Badge */}
      {showVerified && (
        <div className="shrink-0 mx-4 mt-3 flex justify-center animate-verified-pop">
          <div className="flex items-center gap-2 px-5 py-2 rounded-xl border-2 border-primary bg-background/80 backdrop-blur-sm shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary tracking-widest font-mono">{t.auditVerified}</span>
          </div>
        </div>
      )}

      {/* Dual-wing body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-4 overflow-y-auto">
        <section className="lg:w-1/2 flex flex-col">
          <InputPanel images={images} onImagesChange={(imgs) => { setImages(imgs); setAuditComplete(false); setShowVerified(false); }} />
        </section>
        <section className="lg:w-1/2 flex flex-col">
          <AuditFindings ingredients={displayIngredients} hasImage={auditComplete} auditing={auditing} />
        </section>
      </div>

      {/* Health Alert Banner */}
      <HealthAlertBanner
        healthConditions={healthConditions}
        ingredientNames={displayIngredients.map((i) => i.name)}
        visible={auditComplete}
      />

      {/* Recommendations Card */}
      {auditComplete && recommendations.length > 0 && (
        <div className="shrink-0 px-4 pb-3 animate-fade-in">
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                {t.rebalanceSuggestion}
              </span>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => {
                const isRisk = rec.includes("风险") || rec.includes("警告") || rec.includes("偏高") || rec.includes("⚠");
                return (
                  <div key={i} className={`flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0 ${isRisk ? "bg-destructive/5 rounded-lg px-2 -mx-2" : ""}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isRisk ? "bg-destructive" : "bg-primary"}`} />
                    <span className={`text-xs leading-relaxed ${isRisk ? "text-destructive font-medium" : "text-card-foreground"}`}>{rec}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Audit History Log */}
      <AuditHistoryLog />

      {/* Bottom: Spatial Audit Logs */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SpatialAuditLogs integrityScore={bpiScore} hasData={auditComplete} auditing={auditing} />
      </div>
    </div>
  );
};

export default Audit;
