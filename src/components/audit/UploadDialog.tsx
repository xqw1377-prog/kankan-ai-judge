import { useRef } from "react";
import { Upload, Camera, ScanLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: FileList) => void;
  imageCount: number;
}

const UploadDialog = ({ open, onOpenChange, onFilesSelected, imageCount }: UploadDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      onFilesSelected(e.dataTransfer.files);
      onOpenChange(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesSelected(e.target.files);
      onOpenChange(false);
    }
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-primary/20 sm:max-w-md"
        style={{
          boxShadow: "0 0 40px hsl(43 72% 52% / 0.08), 0 8px 32px hsl(0 0% 0% / 0.6)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-mono tracking-widest text-primary">
            <ScanLine className="w-4 h-4" />
            MULTI-MODAL UPLOAD
          </DialogTitle>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="relative min-h-[180px] rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/50 bg-background/60 backdrop-blur-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
        >
          <div className="w-14 h-14 rounded-2xl border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors">
            <Upload className="w-6 h-6 text-primary/40 group-hover:text-primary/70 transition-colors" />
          </div>
          <p className="text-sm font-semibold text-card-foreground/80">
            Drag & Drop or Click to Upload
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            GDAS X-RAY AUDIT • MULTI-IMAGE SUPPORT
          </p>
          <div className="flex items-center gap-2 text-primary/30 mt-1">
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono tracking-widest">X-RAY / CAPTURE</span>
          </div>
          {imageCount > 0 && (
            <span className="absolute top-3 right-3 text-[9px] font-mono text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
              {imageCount} LOADED
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
