import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface BalanceCelebrationProps {
  show: boolean;
  onDone: () => void;
}

export default function BalanceCelebration({ show, onDone }: BalanceCelebrationProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDone();
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center animate-fade-in">
      {/* Golden radial burst */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(circle at center, hsl(43 72% 52% / 0.25) 0%, hsl(43 72% 52% / 0.08) 40%, transparent 70%)",
        animation: "breathe 1.5s ease-in-out infinite",
      }} />

      {/* Gold particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: `hsl(${40 + Math.random() * 10} ${60 + Math.random() * 20}% ${50 + Math.random() * 15}%)`,
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `confetti-fall ${1.5 + Math.random() * 1.5}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}

      {/* Center badge */}
      <div className="relative flex flex-col items-center gap-2 animate-scale-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, hsl(43 80% 60%) 0%, hsl(43 72% 45%) 100%)",
            boxShadow: "0 0 40px hsl(43 72% 52% / 0.6), 0 0 80px hsl(43 72% 52% / 0.3)",
          }}
        >
          <span className="text-2xl">⚖️</span>
        </div>
        <p className="text-sm font-bold text-glow-gold" style={{ color: "hsl(43, 72%, 60%)" }}>
          {t.dataBalanced}
        </p>
        <p className="text-[10px]" style={{ color: "hsl(43, 50%, 45%)" }}>
          {t.assetsSettled}
        </p>
      </div>
    </div>
  );
}
