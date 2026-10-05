import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Camera, ImagePlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";
import AiConsentDialog, { hasAiConsent } from "@/components/AiConsentDialog";
import { ensureAnalysisSession } from "@/lib/ensureAnalysisSession";
import { toFoodAnalysis } from "@/lib/foodAnalysis";
import { GUEST_FREE_LIMIT } from "@/lib/guestQuota";
import { inspectImages } from "@/lib/imageGuard";
import { readInvokeFailure } from "@/lib/invokeFailure";
import { scanAttemptKey } from "@/lib/scanAttempt";
import { takePhoto, pickPhoto } from "@/lib/camera";

const MAX_PHOTOS = 5;
type FailCode = "missing_key" | "unavailable" | "unrecognized" | "signin" | "image" | "guest_limit";

/** /scan is the single capture flow: capture/pick → preview → add more → analyze → Result. */
const Scan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { t, locale } = useI18n();

  const initial: string[] = (() => {
    const raw = location.state?.images as string[] | undefined;
    const one = location.state?.imageData as string | undefined;
    return raw && raw.length > 0 ? raw.slice(0, MAX_PHOTOS) : one ? [one] : [];
  })();

  const [images, setImages] = useState<string[]>(initial);
  const [phase, setPhase] = useState<"capture" | "analyzing">(initial.length > 0 ? "analyzing" : "capture");
  const [slowLevel, setSlowLevel] = useState(0);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGranted, setConsentGranted] = useState(hasAiConsent());
  const [failure, setFailure] = useState<FailCode | null>(null);
  const [imageError, setImageError] = useState("");
  const cancelledRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if (phase !== "analyzing" || images.length <= 1) return;
    const id = setInterval(() => setCurrentPreview((p) => (p + 1) % images.length), 1200);
    return () => clearInterval(id);
  }, [phase, images.length]);

  const fail = (code: FailCode, message?: string) => {
    if (cancelledRef.current) return;
    if (message) setImageError(message);
    setFailure(code);
  };

  const analyze = useCallback(async () => {
    if (images.length === 0 || runningRef.current) return;
    runningRef.current = true;
    setFailure(null);
    setSlowLevel(0);
    const t3 = setTimeout(() => setSlowLevel(1), 3000);
    const t6 = setTimeout(() => setSlowLevel(2), 6000);
    try {
      const checked = inspectImages(images);
      if (!checked.ok) return fail("image", (checked as { error: string }).error);

      const session = await ensureAnalysisSession(supabase.auth);
      if (session === "signin") return fail("signin");

      const userContext = profile ? {
        goal: profile.goal,
        allergies: profile.allergies,
        diet_preference: profile.diet_preference,
      } : {};
      try {
        const { data: sessionAfter } = await supabase.auth.getSession();
        const anonymous = sessionAfter.session?.user?.is_anonymous === true;
        const idempotencyKey = anonymous ? await scanAttemptKey(images) : null;
        const body = {
          ...(images.length === 1 ? { imageBase64: images[0] } : { imagesBase64: images }),
          userContext,
          language: locale,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        };
        const { data, error } = await supabase.functions.invoke("analyze-food", { body });
        const f = await readInvokeFailure(data, error);
        const message = f.message;
        if (error || f.code || message) {
          const code: FailCode = f.code === GUEST_FREE_LIMIT
            ? "guest_limit"
            : /LOVABLE_API_KEY|not configured|api[_ ]?key/i.test(message)
              ? "missing_key"
              : /没能识别|无法识别|不是食物|unrecognized/i.test(message)
                ? "unrecognized"
                : "unavailable";
          return fail(code);
        }
        const result = toFoodAnalysis(data);
        if (!result) return fail("unrecognized");
        if (cancelledRef.current) return;
        navigate("/result", { state: { images, imageData: images[0], result }, replace: true });
      } catch {
        fail("unavailable");
      }
    } finally {
      clearTimeout(t3);
      clearTimeout(t6);
      runningRef.current = false;
    }
  }, [images, profile, locale, navigate]);

  // Auto-start when an entry point already handed over photos.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (phase !== "analyzing" || autoStartedRef.current) return;
    if (!consentGranted) { setShowConsent(true); return; }
    autoStartedRef.current = true;
    analyze();
  }, [phase, consentGranted, analyze]);

  const startAnalysis = () => {
    if (images.length === 0) return;
    autoStartedRef.current = false;
    setPhase("analyzing");
  };

  const addPhoto = async (fromCamera: boolean) => {
    if (images.length >= MAX_PHOTOS) return;
    const data = fromCamera ? await takePhoto() : await pickPhoto();
    if (data) setImages((prev) => (prev.length < MAX_PHOTOS ? [...prev, data] : prev));
  };

  const handleCancel = () => {
    cancelledRef.current = true;
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

  const closeBtn = (
    <button onClick={handleCancel} aria-label={t.cancel} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
      <X className="w-5 h-5" />
    </button>
  );

  if (phase === "capture") {
    return (
      <div className="h-full flex flex-col bg-background relative px-6 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {closeBtn}
        <h1 className="text-xl font-bold text-card-foreground">{t.takePhoto}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.scanCaptureHint(MAX_PHOTOS)}</p>

        <div className="flex-1 flex flex-col justify-center">
          {images.length === 0 ? (
            <button
              onClick={() => addPhoto(true)}
              className="mx-auto w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft active:scale-95 transition-transform"
              aria-label={t.scanTakeAnother}
            >
              <Camera className="w-10 h-10" />
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={src} alt={`photo-${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={t.delete}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {images.length > 0 && (
            <button
              onClick={startAnalysis}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> {t.scanStartAnalysis(images.length)}
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => addPhoto(true)}
              disabled={images.length >= MAX_PHOTOS}
              className="py-3 rounded-xl border border-border text-sm font-semibold text-card-foreground flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Camera className="w-4 h-4" /> {images.length === 0 ? t.scanTakePhotoBtn : t.scanTakeAnother}
            </button>
            <button
              onClick={() => addPhoto(false)}
              disabled={images.length >= MAX_PHOTOS}
              className="py-3 rounded-xl border border-border text-sm font-semibold text-card-foreground flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <ImagePlus className="w-4 h-4" /> {t.scanAddFromAlbum}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background relative px-6">
      {closeBtn}

      <div className="relative w-[65vw] max-w-64 aspect-square rounded-2xl overflow-hidden shadow-card mb-8 border border-border">
        <img src={images[currentPreview] ?? images[0]} alt="food" className="w-full h-full object-cover" />
        {!failure && <div className="absolute left-0 w-full h-0.5 bg-primary animate-scan-line" style={{ top: "0%" }} />}
        {images.length > 1 && (
          <div className="absolute top-3 left-3 glass text-xs font-bold px-2.5 py-1 rounded-full text-card-foreground">
            {currentPreview + 1}/{images.length}
          </div>
        )}
      </div>

      {failure ? (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <p className="text-base font-semibold text-card-foreground">
            {failure === "guest_limit" ? t.guestFreeLimit : "没能完成估算"}
          </p>
          {failure !== "guest_limit" && (
            <p className="text-sm text-muted-foreground leading-relaxed">{failureText}</p>
          )}
          {failure === "guest_limit" ? (
            <button onClick={() => navigate("/login", { state: { upgrade: true } })} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.loginSignUp}
            </button>
          ) : failure === "signin" ? (
            <button onClick={() => navigate("/login")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.loginSignIn}
            </button>
          ) : failure === "image" ? (
            <button onClick={() => { setFailure(null); setPhase("capture"); }} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.scanTakeAnother}
            </button>
          ) : (
            <button onClick={() => analyze()} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
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
          {slowLevel >= 1 && <p className="text-sm text-muted-foreground animate-fade-in">{t.scanRecognizing}</p>}
          {slowLevel >= 2 && <p className="text-xs text-muted-foreground animate-fade-in">{t.scanSlowHint}</p>}
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
        onDecline={() => { setShowConsent(false); setPhase("capture"); }}
      />
    </div>
  );
};

export default Scan;
