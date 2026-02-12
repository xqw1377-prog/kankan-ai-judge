import { useState, useRef, useCallback } from "react";
import { Upload, Camera, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface InputPanelProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const PIXEL_PHASES = [
  "Scanning pixel density matrix...",
  "Detecting hidden oil signatures...",
  "Mapping ingredient boundaries...",
  "Quantifying spatial distribution...",
  "Finalizing pixel analysis...",
];

const InputPanel = ({ images, onImagesChange }: InputPanelProps) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [analysisReady, setAnalysisReady] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImages = [...images.slice(-4), e.target?.result as string];
          onImagesChange(newImages);

          // Start pixel analysis simulation
          setAnalyzing(true);
          setAnalyzeProgress(0);
          setPhaseIdx(0);
          let p = 0;
          let phase = 0;
          const timer = setInterval(() => {
            p += Math.random() * 8 + 2;
            if (p >= 100) {
              p = 100;
              clearInterval(timer);
              setTimeout(() => {
                setAnalyzing(false);
                setAnalysisReady(true);
              }, 600);
            }
            const newPhase = Math.min(PIXEL_PHASES.length - 1, Math.floor((p / 100) * PIXEL_PHASES.length));
            if (newPhase !== phase) {
              phase = newPhase;
              setPhaseIdx(phase);
            }
            setAnalyzeProgress(Math.min(100, p));
          }, 180);
        };
        reader.readAsDataURL(file);
      });
    },
    [images, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Title */}
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-card-foreground tracking-wide">
          MULTI-MODAL INPUT
        </span>
      </div>

      {/* Upload Card */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex-1 min-h-[200px] rounded-xl border-2 border-primary/20 hover:border-primary/50 bg-secondary/60 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-[inset_0_1px_0_hsl(var(--primary)/0.08),0_0_20px_hsl(var(--primary)/0.05)]"
      >
        {images.length > 0 ? (
          <div className="relative w-full h-full min-h-[200px]">
            <img
              src={images[images.length - 1]}
              alt="food"
              className="w-full h-full object-cover rounded-[10px]"
            />
            {/* Scan overlay when analyzing */}
            {analyzing && (
              <div className="absolute inset-0 bg-background/50 rounded-[10px]">
                <div className="absolute left-0 w-full h-0.5 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)] animate-scan-line" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono text-primary animate-pulse tracking-widest">
                    Pixel scanning...
                  </span>
                </div>
              </div>
            )}
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-primary/30 px-2.5 py-1 rounded-full text-[10px] font-mono text-primary">
              {images.length} IMAGE{images.length > 1 ? "S" : ""} LOADED
            </div>
            {/* Pixel Analysis Ready overlay */}
            {analysisReady && !analyzing && (
              <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm py-2 px-3 flex items-center gap-2 rounded-b-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-mono text-success tracking-widest">
                  PIXEL ANALYSIS READY...
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-primary/25 flex items-center justify-center group-hover:border-primary/50 transition-colors">
              <Upload className="w-7 h-7 text-primary/40 group-hover:text-primary/70 transition-colors" />
            </div>
            <p className="text-sm font-semibold text-card-foreground/80">
              Drag & Drop Meal Image
            </p>
            <p className="text-[11px] text-muted-foreground">
              Click to Upload for GDAS Audit
            </p>
            <div className="flex items-center gap-2 text-primary/40 mt-1">
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono tracking-widest">CAPTURE / DRAG</span>
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

      {/* Pixel Analysis Progress */}
      {analyzing && (
        <div className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-primary animate-pulse">
              Pixel Analysis in progress...
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {Math.round(analyzeProgress)}%
            </span>
          </div>
          <Progress value={analyzeProgress} className="h-1.5 bg-secondary" />
          <p className="text-[9px] font-mono text-muted-foreground/70 truncate">
            {PIXEL_PHASES[phaseIdx]}
          </p>
        </div>
      )}
    </div>
  );
};

export default InputPanel;
