import { useState, useCallback } from "react";
import TheEye from "@/components/TheEye";
import ScanOverlay from "@/components/ScanOverlay";
import VerdictCard from "@/components/VerdictCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppPhase = "idle" | "scanning" | "result";

interface FoodResult {
  food: string;
  sin: number;
  roast: string;
}

const FALLBACK_RESULT: FoodResult = {
  food: "神秘食物",
  sin: 50,
  roast: "AI 短路了，但你心里清楚自己吃了什么。",
};

const Index = () => {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [imageData, setImageData] = useState<string>("");
  const [result, setResult] = useState<FoodResult>(FALLBACK_RESULT);
  const { toast } = useToast();

  const handleCapture = useCallback(async (data: string) => {
    setImageData(data);
    setPhase("scanning");

    try {
      const { data: fnData, error } = await supabase.functions.invoke("analyze-food", {
        body: { imageBase64: data },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast({
          title: "分析失败",
          description: "AI 暂时开小差了，请重试",
          variant: "destructive",
        });
        setResult(FALLBACK_RESULT);
      } else if (fnData?.error) {
        toast({
          title: "分析失败",
          description: fnData.error,
          variant: "destructive",
        });
        setResult(FALLBACK_RESULT);
      } else {
        setResult({
          food: fnData.food || "未知食物",
          sin: typeof fnData.sin === "number" ? fnData.sin : 50,
          roast: fnData.roast || "AI 无话可说。",
        });
      }
    } catch (err) {
      console.error("Request failed:", err);
      toast({
        title: "网络错误",
        description: "请检查网络连接后重试",
        variant: "destructive",
      });
      setResult(FALLBACK_RESULT);
    }

    setPhase("result");
  }, [toast]);

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
