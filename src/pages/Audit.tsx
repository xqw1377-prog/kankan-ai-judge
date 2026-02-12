import { useState, useRef, useCallback } from "react";
import { Upload, Camera, Microscope, FlaskConical, Dna, X, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface DetectedIngredient {
  name: string;
  grams: number;
  gi: number;
  gl: number;
  oilG: number;
  spatialClaim: number;
  cookMethod: string;
  x: number;
  y: number;
}

const COOK_METHODS = ["pan-fried", "fried", "steamed", "boiled", "stir-fried", "raw"];

const MOCK_INGREDIENTS: DetectedIngredient[] = [
  { name: "鸡胸肉 / Chicken Breast", grams: 150, gi: 0, gl: 0, oilG: 3.2, spatialClaim: 35, cookMethod: "pan-fried", x: 30, y: 40 },
  { name: "西兰花 / Broccoli", grams: 80, gi: 15, gl: 1.2, oilG: 1.5, spatialClaim: 25, cookMethod: "stir-fried", x: 65, y: 30 },
  { name: "白米饭 / White Rice", grams: 200, gi: 73, gl: 29.2, oilG: 0, spatialClaim: 30, cookMethod: "boiled", x: 50, y: 65 },
  { name: "番茄 / Tomato", grams: 60, gi: 15, gl: 0.6, oilG: 0.8, spatialClaim: 10, cookMethod: "raw", x: 20, y: 70 },
];

const Audit = () => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<DetectedIngredient[]>([]);
  const [computeProgress, setComputeProgress] = useState(0);
  const [computing, setComputing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [overlayPhase, setOverlayPhase] = useState(0); // 0=penetrating, 1=done

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [...prev.slice(-4), e.target?.result as string]);
        // Simulate detection
        setIngredients(MOCK_INGREDIENTS);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const updateIngredient = (idx: number, field: keyof DetectedIngredient, value: any) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
    // Simulate compute feedback
    setComputing(true);
    setComputeProgress(0);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 25;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setTimeout(() => setComputing(false), 300);
      }
      setComputeProgress(Math.min(100, p));
    }, 120);
  };

  const handleGenerateAudit = () => {
    if (images.length === 0) return;
    setShowOverlay(true);
    setOverlayPhase(0);
    // Phase 1: penetration animation
    setTimeout(() => setOverlayPhase(1), 2500);
    // Phase 2: show report
    setTimeout(() => {
      setShowOverlay(false);
      setShowReport(true);
    }, 4000);
  };

  const totalGl = ingredients.reduce((s, i) => s + i.gl, 0);
  const totalOil = ingredients.reduce((s, i) => s + i.oilG, 0);
  const avgGi = ingredients.length ? Math.round(ingredients.reduce((s, i) => s + i.gi, 0) / ingredients.length) : 0;
  const metabolicQuota = Math.max(0, 100 - Math.round(totalGl * 1.5 + totalOil * 0.8));

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-border">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-card-foreground tracking-wide">{t.auditWorkspace}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Microscope className="w-4 h-4 text-primary/60" />
          <span className="text-[10px] font-mono text-muted-foreground">GDAS v2.1</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 pb-24">
        {/* Left: Visual Audit Zone */}
        <section className="lg:w-1/2 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Dna className="w-4 h-4 text-primary/70" />
            <span className="text-xs font-semibold text-card-foreground">{t.visualAudit}</span>
          </div>

          {/* Upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="relative rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer min-h-[240px] flex flex-col items-center justify-center gap-3 glass"
          >
            {images.length > 0 ? (
              <div className="relative w-full h-full min-h-[240px]">
                <img
                  src={images[images.length - 1]}
                  alt="food"
                  className="w-full h-full object-cover rounded-xl"
                />
                {/* Ingredient coordinate dots */}
                {ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full border-2 border-primary bg-primary/30 animate-pulse-soft"
                    style={{ left: `${ing.x}%`, top: `${ing.y}%`, transform: "translate(-50%,-50%)" }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap glass px-1.5 py-0.5 rounded text-[9px] font-mono text-primary">
                      {ing.name.split("/")[0].trim()}
                    </div>
                  </div>
                ))}
                {/* Badge */}
                <div className="absolute top-3 right-3 glass px-2 py-1 rounded-full text-[10px] font-mono text-primary">
                  {t.ingredientCoordinates}: {ingredients.length}
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t.dropOrCapture}</p>
                <div className="flex gap-2">
                  <Camera className="w-4 h-4 text-primary/60" />
                  <span className="text-xs text-primary/60">CAPTURE</span>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </section>

        {/* Right: Audit Parameters */}
        <section className="lg:w-1/2 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Microscope className="w-4 h-4 text-primary/70" />
            <span className="text-xs font-semibold text-card-foreground">{t.auditParameters}</span>
          </div>

          {ingredients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              {t.noImageUploaded}
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="glass rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-card-foreground">{ing.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{ing.grams}g</span>
                  </div>

                  {/* Spatial Claim */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">{t.spatialClaimRatio}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={ing.spatialClaim}
                      onChange={(e) => updateIngredient(idx, "spatialClaim", Number(e.target.value))}
                      className="flex-1 h-1 bg-secondary rounded-full appearance-none"
                    />
                    <span className="text-[10px] font-mono text-primary w-8 text-right">{ing.spatialClaim}%</span>
                  </div>

                  {/* Cooking Method */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">{t.cookingCorrection}</span>
                    <div className="flex gap-1 flex-wrap">
                      {COOK_METHODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => updateIngredient(idx, "cookMethod", m)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            ing.cookMethod === m
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate Audit Button */}
          <button
            onClick={handleGenerateAudit}
            disabled={images.length === 0}
            className="mt-auto w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:shadow-[0_0_20px_hsl(43_72%_52%/0.3)]"
          >
            <FlaskConical className="w-4 h-4" />
            {t.generateAudit}
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      {/* Bottom: Compute Progress */}
      {computing && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 animate-fade-in">
          <div className="glass rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">{t.computeProgress}</span>
              <span className="text-[10px] font-mono text-primary">{Math.round(computeProgress)}%</span>
            </div>
            <Progress value={computeProgress} className="h-1.5 bg-secondary" />
          </div>
        </div>
      )}

      {/* ===== GDAS Penetration Overlay ===== */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center animate-fade-in">
          {images.length > 0 && (
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_40px_hsl(43_72%_52%/0.15)]">
              <img src={images[images.length - 1]} alt="audit" className="w-full h-full object-cover" />
              {/* Scan line */}
              <div className="absolute left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_hsl(43_72%_52%/0.6)] animate-scan-line" />

              {/* GI/GL/Oil overlays on ingredients */}
              {overlayPhase >= 0 &&
                ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="absolute animate-fade-in"
                    style={{
                      left: `${ing.x}%`,
                      top: `${ing.y}%`,
                      transform: "translate(-50%,-50%)",
                      animationDelay: `${i * 0.3}s`,
                    }}
                  >
                    <div className="glass-strong rounded-lg px-2 py-1 text-center space-y-0.5 min-w-[80px]">
                      <div className="text-[9px] font-mono text-primary">GI {ing.gi}</div>
                      <div className={`text-[9px] font-mono ${ing.gl > 15 ? "text-destructive" : "text-success"}`}>
                        GL {ing.gl.toFixed(1)}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground">
                        {t.estimatedOilIntake} {ing.oilG}g
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <p className="mt-6 text-sm font-bold text-primary text-glow-gold animate-pulse">
            {t.gdasPenetration}
          </p>
          {overlayPhase >= 1 && (
            <p className="mt-2 text-xs text-muted-foreground animate-fade-in">{t.auditComplete}</p>
          )}
        </div>
      )}

      {/* ===== Digital Health Audit Report Modal ===== */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md glass-strong rounded-2xl border border-primary/20 shadow-[0_0_60px_hsl(43_72%_52%/0.1)] overflow-hidden">
            {/* Report header */}
            <div className="relative p-5 pb-3 border-b border-border">
              <button onClick={() => setShowReport(false)} className="absolute top-4 right-4 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-mono text-primary/60 tracking-widest">KANKAN AUDIT LAB</span>
              </div>
              <h2 className="text-lg font-bold text-card-foreground">{t.digitalHealthAuditReport}</h2>
            </div>

            {/* Report body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center space-y-1">
                  <div className="text-lg font-mono font-bold text-primary">{avgGi}</div>
                  <div className="text-[10px] text-muted-foreground">Avg GI</div>
                </div>
                <div className="text-center space-y-1">
                  <div className={`text-lg font-mono font-bold ${totalGl > 40 ? "text-destructive" : "text-success"}`}>
                    {totalGl.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Total GL</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-mono font-bold text-card-foreground">{totalOil.toFixed(1)}g</div>
                  <div className="text-[10px] text-muted-foreground">{t.estimatedOilIntake}</div>
                </div>
              </div>

              {/* Inflammation Risk */}
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Dna className="w-4 h-4 text-primary/70" />
                  <span className="text-xs font-semibold text-card-foreground">{t.inflammationRisk}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      value={Math.min(100, totalGl * 2 + totalOil * 3)}
                      className="h-2 bg-secondary"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      totalGl > 40 ? "text-destructive" : totalGl > 20 ? "text-warning" : "text-success"
                    }`}
                  >
                    {totalGl > 40 ? t.riskHigh : totalGl > 20 ? t.riskMedium : t.riskLow}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {totalGl > 30
                    ? "Elevated glycemic load detected. Consider reducing refined carbohydrate portion and replacing with fiber-rich alternatives."
                    : "Glycemic load within acceptable parameters. Continue current dietary pattern."}
                </p>
              </div>

              {/* Metabolic Quota */}
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-card-foreground">{t.metabolicQuotaRemaining}</span>
                  <span className={`text-lg font-mono font-bold ${metabolicQuota < 30 ? "text-destructive" : "text-primary"}`}>
                    {metabolicQuota}%
                  </span>
                </div>
                <Progress value={metabolicQuota} className="h-2 bg-secondary" />
              </div>

              {/* Ingredient breakdown */}
              <div className="space-y-1.5">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-card-foreground">{ing.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-muted-foreground">GI {ing.gi}</span>
                      <span className={`text-[10px] font-mono ${ing.gl > 15 ? "text-destructive" : "text-success"}`}>
                        GL {ing.gl.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer watermark */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-center gap-2">
              <FlaskConical className="w-3 h-3 text-primary/40" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">
                KANKAN AUDIT LAB · GDAS v2.1
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audit;
