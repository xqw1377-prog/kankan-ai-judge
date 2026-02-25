import { takePhoto } from "@/lib/camera";

interface TheEyeProps {
  onCapture: (imageData: string) => void;
}

const TheEye = ({ onCapture }: TheEyeProps) => {
  const handleClick = async () => {
    const data = await takePhoto();
    if (data) onCapture(data);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-10">
      {/* The Eye */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        <div className="absolute w-56 h-56 rounded-full border-2 border-primary/30 animate-pulse-ring" />
        <div className="absolute w-56 h-56 rounded-full border border-primary/20 animate-pulse-ring" style={{ animationDelay: "0.7s" }} />

        {/* Main eye button */}
        <button
          onClick={handleClick}
          className="relative w-48 h-48 rounded-full bg-secondary border-4 border-primary animate-breathe flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          aria-label="拍照"
        >
          {/* Inner iris */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center">
            {/* Pupil */}
            <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>
          </div>

          {/* Glint */}
          <div className="absolute top-8 right-12 w-4 h-4 rounded-full bg-foreground/40 blur-[1px]" />
        </button>
      </div>

      {/* Slogan */}
      <p className="text-2xl font-black text-foreground tracking-wide text-glow-orange select-none">
        别藏了，给我<span className="text-primary">看看</span>。
      </p>
    </div>
  );
};

export default TheEye;
