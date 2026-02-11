interface VerdictCardProps {
  foodName: string;
  sinValue: number;
  roast: string;
  onRetake: () => void;
  onShare: () => void;
}

const VerdictCard = ({ foodName, sinValue, roast, onRetake, onShare }: VerdictCardProps) => {
  const barColor =
    sinValue > 70 ? "bg-destructive" : sinValue > 40 ? "bg-primary" : "bg-accent";

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5">
      <div className="animate-verdict-enter w-full max-w-sm bg-verdict rounded-xl p-6 border border-verdict-border shadow-2xl" style={{ transform: "rotate(-0.5deg)" }}>
        {/* Header stamp */}
        <div className="text-center mb-4">
          <p className="text-xs tracking-[0.3em] text-verdict-foreground/50 uppercase font-bold">KanKan 判决书</p>
          <div className="w-16 h-0.5 bg-verdict-foreground/20 mx-auto mt-2" />
        </div>

        {/* Food name */}
        <h2 className="text-3xl font-black text-verdict-foreground text-center mb-5">
          {foodName}
        </h2>

        {/* Sin meter */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-verdict-foreground/70">罪恶值</span>
            <span className="text-lg font-black text-verdict-foreground">{sinValue}%</span>
          </div>
          <div className="w-full h-4 bg-verdict-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
              style={{ width: `${sinValue}%` }}
            />
          </div>
        </div>

        {/* Roast */}
        <div className="bg-verdict-foreground/5 rounded-lg p-4 mb-6 min-h-[80px]">
          <p className="text-base font-bold text-verdict-foreground leading-relaxed">
            "{roast}"
          </p>
        </div>

        {/* Stamp */}
        <div className="absolute -right-2 -top-2 w-16 h-16 border-4 border-destructive/60 rounded-full flex items-center justify-center rotate-12">
          <span className="text-destructive/60 font-black text-xs">有罪</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-8 w-full max-w-sm">
        <button
          onClick={onRetake}
          className="flex-1 py-4 rounded-xl bg-secondary text-foreground font-black text-base border border-border active:scale-95 transition-transform"
        >
          我不服 (重拍)
        </button>
        <button
          onClick={onShare}
          className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-black text-base active:scale-95 transition-transform shadow-neon-orange"
        >
          分享给饭友
        </button>
      </div>
    </div>
  );
};

export default VerdictCard;
