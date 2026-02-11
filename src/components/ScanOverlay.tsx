interface ScanOverlayProps {
  imageData: string;
}

const ScanOverlay = ({ imageData }: ScanOverlayProps) => {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      {/* Photo with scan effect */}
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-scan-green shadow-neon-green">
        <img src={imageData} alt="captured" className="w-full h-full object-cover" />
        {/* Scan line */}
        <div className="absolute left-0 w-full h-1 bg-scan-green shadow-neon-green animate-scan-line" style={{ top: "0%" }} />
        {/* Overlay tint */}
        <div className="absolute inset-0 bg-scan-green/5" />
      </div>

      {/* Status text */}
      <p className="text-xl font-black text-scan-green text-glow-green tracking-wider animate-pulse">
        AI 正在透视中...
      </p>
    </div>
  );
};

export default ScanOverlay;
