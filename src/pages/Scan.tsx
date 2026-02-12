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
  const startedRef = useRef(false);

  const analyze = useCallback(async () => {
    if (!imageData || startedRef.current) return;
    startedRef.current = true;

    // Build user context for AI
    const userContext = profile ? {
      goal: profile.goal,
      allergies: profile.allergies,
      diet_preference: profile.diet_preference,
    } : {};

    try {
      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { imageBase64: imageData, userContext },
      });

      if (cancelled) return;

      if (error || data?.error) {
        navigate("/result", {
          state: {
            imageData,
            result: {
              food: "未知食物",
              calories: 0,
              protein_g: 0,
              fat_g: 0,
              carbs_g: 0,
              ingredients: [],
              verdict: "AI 暂时开小差了",
              suggestion: "",
            },
          },
          replace: true,
        });
        return;
      }

      navigate("/result", {
        state: { imageData, result: data },
        replace: true,
      });
    } catch {
      if (!cancelled) {
        navigate("/result", {
          state: {
            imageData,
            result: {
              food: "未知食物",
              calories: 0,
              protein_g: 0,
              fat_g: 0,
              carbs_g: 0,
              ingredients: [],
              verdict: "网络错误，请重试",
              suggestion: "",
            },
          },
          replace: true,
        });
      }
    }
  }, [imageData, navigate, cancelled, profile]);

  useEffect(() => {
    if (!imageData) {
      navigate("/", { replace: true });
      return;
    }
    // Minimum display time of 2s before showing result
    const timer = setTimeout(() => analyze(), 100);
    return () => clearTimeout(timer);
  }, [imageData, navigate, analyze]);

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
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-semibold text-foreground">KANKAN 正在分析食材…</p>
        <p className="text-sm text-muted-foreground">✨ 识别中 ✨</p>
      </div>
    </div>
  );
};

export default Scan;
