import { useState, useRef, useCallback, useEffect } from "react";
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

const MOLECULAR_TAGS = [
  "Analyzing Glycemic Load...",
  "Detecting Trans-fats...",
  "Mapping Saturated Lipids...",
  "Quantifying Fiber Density...",
  "Scanning Protein Chains...",
  "Isolating Sodium Clusters...",
  "Tracing Carb Polymers...",
  "Measuring Oil Penetration...",
];

interface FloatingTag {
  id: number;
  text: string;
  x: number;
  y: number;
}

const InputPanel = ({ images, onImagesChange }: InputPanelProps) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [scanLineY, setScanLineY] = useState(0);
  const [floatingTags, setFloatingTags] = useState<FloatingTag[]>([]);
  const tagIdRef = useRef(0);

  // Floating molecular tags during scan
  useEffect(() => {
    if (!analyzing) {
      setFloatingTags([]);
      return;
    }
    const interval = setInterval(() => {
      const tag: FloatingTag = {
        id: tagIdRef.current++,
        text: MOLECULAR_TAGS[Math.floor(Math.random() * MOLECULAR_TAGS.length)],
        x: 10 + Math.random() * 60,
        y: Math.max(5, scanLineY - 5 + Math.random() * 10),
      };
      setFloatingTags((prev) => [...prev.slice(-4), tag]);
    }, 500);
    return () => clearInterval(interval);
  }, [analyzing, scanLineY]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImages = [...images.slice(-4), e.target?.result as string];
          onImagesChange(newImages);

          setAnalyzing(true);
          setAnalyzeProgress(0);
          setPhaseIdx(0);
          setScanLineY(0);
          setAnalysisReady(false);
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
            setScanLineY(Math.min(100, p));
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
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-card-foreground tracking-wide">
          X-RAY UPLOAD ZONE
        </span>
      </div>

      {/* Upload Card — frosted black */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex-1 min-h-[200px] rounded-xl border border-primary/15 hover:border-primary/40 bg-background/80 backdrop-blur-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-[inset_0_2px_12px_hsl(0_0%_0%/0.5),0_0_24px_hsl(var(--primary)/0.04)]"
      >
        {images.length > 0 ? (
          <div className="relative w-full h-full min-h-[200px]">
            <img
              src={images[images.length - 1]}
              alt="food"
              className="w-full h-full object-cover rounded-[10px]"
            />
            {/* X-Ray scan overlay */}
            {analyzing && (
              <div className="absolute inset-0 bg-background/60 rounded-[10px]">
                {/* Laser scan line */}
                <div
                  className="absolute left-0 w-full h-[2px] transition-[top] duration-150 ease-linear"
                  style={{
                    top: `${scanLineY}%`,
                    background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary)) 80%, transparent 100%)",
                    boxShadow: "0 0 16px 4px hsl(var(--primary) / 0.5), 0 0 40px 8px hsl(var(--primary) / 0.2)",
                  }}
                />
                {/* Grid lines for X-ray effect */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "repeating-linear-gradient(90deg, hsl(var(--primary)) 0px, transparent 1px, transparent 40px)",
                }} />

                {/* Floating molecular tags */}
                {floatingTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="absolute px-2 py-0.5 rounded bg-primary/20 border border-primary/30 backdrop-blur-sm animate-xray-tag"
                    style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                  >
                    <span className="text-[9px] font-mono text-primary whitespace-nowrap">
                      {tag.text}
                    </span>
                  </div>
                ))}

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-lg bg-background/70 backdrop-blur-sm border border-primary/20">
                    <span className="text-xs font-mono text-primary animate-pulse tracking-widest">
                      X-RAY SCANNING...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-primary/30 px-2.5 py-1 rounded-full text-[10px] font-mono text-primary">
              {images.length} IMAGE{images.length > 1 ? "S" : ""} LOADED
            </div>
            {analysisReady && !analyzing && (
              <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm py-2 px-3 flex items-center gap-2 rounded-b-[10px] animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-mono text-success tracking-widest">
                  PIXEL ANALYSIS READY — AWAITING AUDIT
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors">
              <Upload className="w-7 h-7 text-primary/30 group-hover:text-primary/60 transition-colors" />
            </div>
            <p className="text-sm font-semibold text-card-foreground/80">
              Drag & Drop Meal Image
            </p>
            <p className="text-[11px] text-muted-foreground">
              Click to Upload for GDAS X-Ray Audit
            </p>
            <div className="flex items-center gap-2 text-primary/30 mt-1">
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono tracking-widest">X-RAY / CAPTURE</span>
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

      {analyzing && (
        <div className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-primary animate-pulse">
              X-Ray Analysis in progress...
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
