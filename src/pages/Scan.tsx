import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";

const Scan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { t, locale } = useI18n();

  const rawImageData = location.state?.imageData as string | undefined;
  const rawImages = location.state?.images as string[] | undefined;
  const images: string[] = rawImages || (rawImageData ? [rawImageData] : []);

  const [cancelled, setCancelled] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);
  const startedRef = useRef(false);
  const resultReadyRef = useRef<any>(null);
  const minTimeRef = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPreview(p => (p + 1) % images.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [images.length]);

  const navigateToResult = useCallback((result: any) => {
    if (cancelled) return;
    navigate("/result", { state: { images, imageData: images[0], result }, replace: true });
  }, [images, navigate, cancelled]);

  const analyze = useCallback(async () => {
    if (images.length === 0 || startedRef.current) return;
    startedRef.current = true;

    const userContext = profile ? {
      goal: profile.goal,
      allergies: profile.allergies,
      diet_preference: profile.diet_preference,
    } : {};

    const fallback = {
      food: "未知食物", calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0,
      ingredients: [], verdict: "", suggestion: "",
    };

    try {
      const body = images.length === 1
        ? { imageBase64: images[0], userContext, language: locale }
        : { imagesBase64: images, userContext, language: locale };

      const { data, error } = await supabase.functions.invoke("analyze-food", { body });

      if (cancelled) return;
      const result = (error || data?.error) ? { ...fallback, verdict: data?.error || "AI error" } : data;

      if (minTimeRef.current) navigateToResult(result);
      else resultReadyRef.current = result;
    } catch {
      if (cancelled) return;
      const errResult = { ...fallback, verdict: "Network error" };
      if (minTimeRef.current) navigateToResult(errResult);
      else resultReadyRef.current = errResult;
    }
  }, [images, cancelled, profile, navigateToResult, locale]);

  useEffect(() => {
    if (images.length === 0) { navigate("/", { replace: true }); return; }
    analyze();
    const minTimer = setTimeout(() => {
      minTimeRef.current = true;
      if (resultReadyRef.current) navigateToResult(resultReadyRef.current);
    }, 2000);
    const slowTimer = setTimeout(() => setShowSlowHint(true), 5000);
    return () => { clearTimeout(minTimer); clearTimeout(slowTimer); };
  }, [images.length, navigate, analyze, navigateToResult]);

  const handleCancel = () => { setCancelled(true); navigate("/", { replace: true }); };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background relative">
      <button onClick={handleCancel} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
        <X className="w-5 h-5" />
      </button>

      {images.length > 0 && (
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-card mb-8">
          <img src={images[currentPreview]} alt="food" className="w-full h-full object-cover transition-opacity duration-300" />
          <div className="absolute left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_hsl(122_39%_49%/0.6)] animate-scan-line" style={{ top: "0%" }} />
          <div className="absolute inset-0 bg-primary/5" />
          {images.length > 1 && (
            <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-full">
              {currentPreview + 1}/{images.length}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-semibold text-foreground">
          {images.length > 1 ? t.scanAnalyzingMulti(images.length) : t.scanAnalyzing}
        </p>
        <p className="text-sm text-muted-foreground">{t.scanRecognizing}</p>
        {showSlowHint && <p className="text-xs text-muted-foreground animate-fade-in mt-2">{t.scanSlowHint}</p>}
      </div>

      <button onClick={handleCancel} className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground underline">
        {t.cancel}
      </button>
    </div>
  );
};

export default Scan;