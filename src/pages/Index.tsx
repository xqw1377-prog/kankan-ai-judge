import { useState, useCallback, useEffect } from "react";
import TheEye from "@/components/TheEye";
import ScanOverlay from "@/components/ScanOverlay";
import VerdictCard from "@/components/VerdictCard";

type AppPhase = "idle" | "scanning" | "result";

const MOCK_RESULTS = [
  { food: "炸鸡腿", sin: 82, roast: "这玩意的油量够你跑三圈操场了。吃完记得给膝盖道个歉。" },
  { food: "珍珠奶茶", sin: 75, roast: "珍珠是淀粉，奶是植脂末，茶是糖水。三重暴击，恭喜你。" },
  { food: "沙拉", sin: 15, roast: "行吧，今天装得挺像健康人的。但那沙拉酱我看见了。" },
  { food: "火锅", sin: 95, roast: "一顿火锅，三天的卡路里。你不是在吃饭，你在渡劫。" },
  { food: "泡面", sin: 68, roast: "深夜泡面，灵魂的自我放逐。调料包全放了吧？我知道的。" },
];

const Index = () => {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [imageData, setImageData] = useState<string>("");
  const [result, setResult] = useState(MOCK_RESULTS[0]);

  const handleCapture = useCallback((data: string) => {
    setImageData(data);
    setPhase("scanning");
  }, []);

  useEffect(() => {
    if (phase === "scanning") {
      const timer = setTimeout(() => {
        const randomResult = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
        setResult(randomResult);
        setPhase("result");
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleRetake = () => {
    setPhase("idle");
    setImageData("");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "KanKan 看看",
        text: `${result.food} 的罪恶值：${result.sin}%！${result.roast}`,
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <header className="pt-12 pb-4 text-center shrink-0">
        <h1 className="text-3xl font-black tracking-tight">
          <span className="text-primary text-glow-orange">看看</span>
          <span className="text-foreground/50 text-sm font-bold ml-2">KanKan</span>
        </h1>
      </header>

      {/* Content */}
      {phase === "idle" && <TheEye onCapture={handleCapture} />}
      {phase === "scanning" && <ScanOverlay imageData={imageData} />}
      {phase === "result" && (
        <VerdictCard
          foodName={result.food}
          sinValue={result.sin}
          roast={result.roast}
          onRetake={handleRetake}
          onShare={handleShare}
        />
      )}

      {/* Bottom hint */}
      {phase === "idle" && (
        <p className="text-center text-muted-foreground text-xs pb-8 shrink-0">
          点击之眼 · 透视你的食物
        </p>
      )}
    </div>
  );
};

export default Index;
