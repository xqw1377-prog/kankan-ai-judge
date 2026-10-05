import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";
import AiConsentDialog, { hasAiConsent } from "@/components/AiConsentDialog";
import { toFoodAnalysis } from "@/lib/foodAnalysis";
import { inspectImages } from "@/lib/imageGuard";

const Scan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { t, locale } = useI18n();

  const rawImageData = location.state?.imageData as string | undefined;
  const rawImages = location.state?.images as string[] | undefined;
  const images = useMemo(
    () => (rawImages && rawImages.length > 0 ? rawImages : rawImageData ? [rawImageData] : []),
    [rawImages, rawImageData],
  );

  const [cancelled, setCancelled] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGranted, setConsentGranted] = useState(hasAiConsent());
  const [failure, setFailure] = useState<"missing_key" | "unavailable" | "unrecognized" | "signin" | "image" | null>(null);
  const [imageError, setImageError] = useState("");
  const startedRef = useRef(false);
  const resultReadyRef = useRef<{ ok: boolean; code?: string; result?: unknown; message?: string } | null>(null);
  const minTimeRef = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPreview((prev) => (prev + 1) % images.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [images.length]);

  const finish = useCallback((outcome: { ok: true; result: ReturnType<typeof toFoodAnalysis> } | { ok: false; code: "missing_key" | "unavailable" | "unrecognized" | "signin" | "image"; message?: string }) => {
    if (cancelled) return;
    if (!outcome.ok) {
      if (outcome.message) setImageError(outcome.message);
      setFailure(outcome.code);
      return;
    }
    if (!outcome.result) {
      setFailure("unrecognized");
      return;
    }
    navigate("/result", {
      state: { images, imageData: images[0], result: outcome.result },
      replace: true,
    });
  }, [images, navigate, cancelled]);

  const analyze = useCallback(async () => {
    if (images.length === 0 || startedRef.current) return;
    startedRef.current = true;
    setFailure(null);

    const checked = inspectImages(images);
    if (!checked.ok) {
      const outcome = { ok: false as const, code: "image" as const, message: checked.error };
      if (minTimeRef.current) finish(outcome);
      else resultReadyRef.current = outcome;
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const outcome = { ok: false as const, code: "signin" as const };
      if (minTimeRef.current) finish(outcome);
      else resultReadyRef.current = outcome;
      return;
    }

    const userContext = profile ? {
      goal: profile.goal,
      allergies: profile.allergies,
      diet_preference: profile.diet_preference,
    } : {};

    let outcome: { ok: true; result: ReturnType<typeof toFoodAnalysis> } | { ok: false; code: "missing_key" | "unavailable" | "unrecognized" };
    try {
      const body = images.length === 1
        ? { imageBase64: images[0], userContext, language: locale }
        : { imagesBase64: images, userContext, language: locale };
      const { data, error } = await supabase.functions.invoke("analyze-food", { body });
      const message = (data && typeof data === "object" && typeof (data as { error?: string }).error === "string")
        ? (data as { error: string }).error
        : error?.message || "";
      if (error || (data && typeof data === "object" && "error" in data && (data as { error?: string }).error)) {
        const code = /LOVABLE_API_KEY|not configured|api[_ ]?key/i.test(message) ? "missing_key" as const : "unavailable" as const;
        outcome = { ok: false, code };
      } else {
        const result = toFoodAnalysis(data);
        outcome = result ? { ok: true, result } : { ok: false, code: "unrecognized" };
      }
    } catch {
      outcome = { ok: false, code: "unavailable" };
    }
    if (cancelled) return;
    if (minTimeRef.current) finish(outcome);
    else resultReadyRef.current = outcome;
  }, [images, cancelled, profile, finish, locale]);

  useEffect(() => {
    if (images.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    if (!consentGranted) {
      setShowConsent(true);
      return;
    }
    analyze();
    const minTimer = setTimeout(() => {
      minTimeRef.current = true;
      if (resultReadyRef.current) finish(resultReadyRef.current);
    }, 2000);
    const slowTimer = setTimeout(() => setShowSlowHint(true), 5000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(slowTimer);
    };
  }, [images.length, navigate, analyze, finish, consentGranted]);

  const handleCancel = () => {
    setCancelled(true);
    navigate("/", { replace: true });
  };

  const failureText = failure === "signin"
    ? "估算会调用云端分析，需要先登录。未登录时照片和记录只留在这台设备上。"
    : failure === "image"
      ? imageError
      : failure === "missing_key"
        ? t.analysisMissingKey
        : failure === "unavailable"
          ? t.analysisUnavailable
          : t.analysisUnrecognized;

  const retry = () => {
    startedRef.current = false;
    resultReadyRef.current = null;
    minTimeRef.current = false;
    setFailure(null);
    setShowSlowHint(false);
    analyze();
    setTimeout(() => {
      minTimeRef.current = true;
      if (resultReadyRef.current) finish(resultReadyRef.current);
    }, 400);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background relative px-6">
      <button onClick={handleCancel} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
        <X className="w-5 h-5" />
      </button>

      {images.length > 0 && (
        <div className="relative w-[65vw] max-w-64 aspect-square rounded-2xl overflow-hidden shadow-card mb-8 border border-border">
          <img src={images[currentPreview]} alt="food" className="w-full h-full object-cover transition-opacity duration-300" />
          {!failure && <div className="absolute left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_hsl(43_72%_52%/0.6)] animate-scan-line" style={{ top: "0%" }} />}
          <div className="absolute inset-0 bg-primary/5" />
          {images.length > 1 && (
            <div className="absolute top-3 left-3 glass text-xs font-bold px-2.5 py-1 rounded-full text-card-foreground">
              {currentPreview + 1}/{images.length}
            </div>
          )}
        </div>
      )}

      {failure ? (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <p className="text-base font-semibold text-card-foreground">没能完成估算</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{failureText}</p>
          {failure === "signin" ? (
            <button onClick={() => navigate("/login")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.loginSignIn}
            </button>
          ) : (
            <button onClick={retry} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.retry}
            </button>
          )}
          <button onClick={handleCancel} className="text-sm text-muted-foreground underline">
            {t.backHome}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-semibold text-card-foreground">
            {images.length > 1 ? t.scanAnalyzingMulti(images.length) : t.scanAnalyzing}
          </p>
          <p className="text-sm text-muted-foreground">{t.scanRecognizing}</p>
          {showSlowHint && <p className="text-xs text-muted-foreground animate-fade-in mt-2">{t.scanSlowHint}</p>}
        </div>
      )}

      {!failure && (
        <button onClick={handleCancel} className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground underline">
          {t.cancel}
        </button>
      )}

      <AiConsentDialog
        open={showConsent}
        onAgree={() => { setShowConsent(false); setConsentGranted(true); }}
        onDecline={() => { setShowConsent(false); navigate("/", { replace: true }); }}
      />
    </div>
  );
};

export default Scan;
