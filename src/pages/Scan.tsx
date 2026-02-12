import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const Scan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const imageData = location.state?.imageData as string;
  const [cancelled, setCancelled] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const startedRef = useRef(false);
  const resultReadyRef = useRef<any>(null);
  const minTimeRef = useRef(false);

  const navigateToResult = useCallback((result: any) => {
    if (cancelled) return;
    navigate("/result", {
      state: { imageData, result },
      replace: true,
    });
  }, [imageData, navigate, cancelled]);

  const analyze = useCallback(async () => {
    if (!imageData || startedRef.current) return;
    startedRef.current = true;

    const userContext = profile ? {
      goal: profile.goal,
      allergies: profile.allergies,
      diet_preference: profile.diet_preference,
    } : {};

    const fallback = {
      food: "未知食物",
      calories: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      ingredients: [],
      verdict: "",
      suggestion: "",
    };

    try {
      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { imageBase64: imageData, userContext },
      });

      if (cancelled) return;

      const result = (error || data?.error) ? { ...fallback, verdict: data?.error || "AI 暂时开小差了" } : data;

      if (minTimeRef.current) {
        navigateToResult(result);
      } else {
        resultReadyRef.current = result;
      }
    } catch {
      if (cancelled) return;
      const errResult = { ...fallback, verdict: "网络错误，请重试" };
      if (minTimeRef.current) {
        navigateToResult(errResult);
      } else {
        resultReadyRef.current = errResult;
      }
    }
  }, [imageData, cancelled, profile, navigateToResult]);

  useEffect(() => {
    if (!imageData) {
      navigate("/", { replace: true });
      return;
    }

    // Start analysis immediately
    analyze();

    // Minimum 2s display time
    const minTimer = setTimeout(() => {
      minTimeRef.current = true;
      if (resultReadyRef.current) {
        navigateToResult(resultReadyRef.current);
      }
    }, 2000);

    // Show slow hint after 5s
    const slowTimer = setTimeout(() => setShowSlowHint(true), 5000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(slowTimer);
    };
  }, [imageData, navigate, analyze, navigateToResult]);

  const handleCancel = () => {
    setCancelled(true);
    navigate("/", { replace: true });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background relative">
      {/* Cancel */}
      <button onClick={handleCancel} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
        <X className="w-5 h-5" />
      </button>

      {/* Image with scan effect */}
      {imageData && (
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-card mb-8">
          <img src={imageData} alt="food" className="w-full h-full object-cover" />
          <div className="absolute left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_hsl(122_39%_49%/0.6)] animate-scan-line" style={{ top: "0%" }} />
          <div className="absolute inset-0 bg-primary/5" />
        </div>
      )}

      {/* Loading indicator */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-semibold text-foreground">KANKAN 正在分析食材…</p>
        <p className="text-sm text-muted-foreground">✨ 识别中 ✨</p>
        {showSlowHint && (
          <p className="text-xs text-muted-foreground animate-fade-in mt-2">
            分析时间较长，请耐心等待
          </p>
        )}
      </div>

      {/* Cancel button at bottom */}
      <button
        onClick={handleCancel}
        className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground underline"
      >
        取消
      </button>
    </div>
  );
};

export default Scan;
