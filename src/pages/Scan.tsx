import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Camera, ImagePlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import AiConsentDialog, { hasAiConsent, setAiConsent } from "@/components/AiConsentDialog";
import TurnstileWidget from "@/components/TurnstileWidget";
import { ensureAnalysisSession, type AnalysisSessionUser } from "@/lib/ensureAnalysisSession";
import { toFoodAnalysis } from "@/lib/foodAnalysis";
import { GUEST_FREE_LIMIT } from "@/lib/guestQuota";
import { inspectImages } from "@/lib/imageGuard";
import { readInvokeFailure } from "@/lib/invokeFailure";
import { scanAttemptKey } from "@/lib/scanAttempt";
import { takePhoto, pickPhoto } from "@/lib/camera";
import { anonymousAccessGate, readTurnstileSiteKey } from "@/lib/turnstileGate";
import type { AppendTarget } from "@/lib/mealAppend";

const MAX_PHOTOS = 5;
type FailCode = "missing_key" | "unavailable" | "unrecognized" | "signin" | "image" | "guest_limit" | "captcha";

/** /scan is the single capture flow: capture/pick → preview → add more → analyze → Result. */
const Scan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const initial: string[] = (() => {
    const raw = location.state?.images as string[] | undefined;
    const one = location.state?.imageData as string | undefined;
    return raw && raw.length > 0 ? raw.slice(0, MAX_PHOTOS) : one ? [one] : [];
  })();

  const appendTo = location.state?.appendTo as AppendTarget | undefined;
  const [images, setImages] = useState<string[]>(initial);
  const [limitPrompt, setLimitPrompt] = useState(false);
  const [phase, setPhase] = useState<"capture" | "analyzing">(initial.length > 0 ? "analyzing" : "capture");
  const [slowLevel, setSlowLevel] = useState(0);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentUserId, setConsentUserId] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [failure, setFailure] = useState<FailCode | null>(null);
  const [imageError, setImageError] = useState("");
  const cancelledRef = useRef(false);
  const runningRef = useRef(false);
  const captchaTokenRef = useRef<string | null>(null);
  const analyzeRef = useRef<() => Promise<void>>(async () => {});

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

      let knownUser: AnalysisSessionUser | null = null;
      const session = await ensureAnalysisSession(supabase.auth, {
        captchaReady: Boolean(captchaTokenRef.current),
        onUser: (user) => { knownUser = user; },
      });
      const needsAnonymous = session === "captcha" || Boolean(knownUser?.isAnonymous);
      if (needsAnonymous) {
        const gate = anonymousAccessGate({
          prod: Boolean(import.meta.env.PROD),
          siteKey: readTurnstileSiteKey(),
          token: captchaTokenRef.current,
          needsAnonymous: true,
        });
        if (gate === "closed") return fail("captcha");
        if (gate === "challenge") {
          setShowCaptcha(true);
          return;
        }
      }
      if (session !== "ready" || !knownUser) return fail("signin");
      const signedIn = knownUser as AnalysisSessionUser;
      if (!hasAiConsent(signedIn.id)) {
        setConsentUserId(signedIn.id);
        setShowConsent(true);
        setShowCaptcha(false);
        return;
      }

      const anonymous = signedIn.isAnonymous;
      const idempotencyKey = anonymous ? await scanAttemptKey(images) : null;
      const body = {
        ...(images.length === 1 ? { imageBase64: images[0] } : { imagesBase64: images }),
        language: locale,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...(captchaTokenRef.current ? { turnstileToken: captchaTokenRef.current } : {}),
      };
      try {
        const { data, error } = await supabase.functions.invoke("analyze-food", { body });
        const f = await readInvokeFailure(data, error);
        const message = f.message;
        if (error || f.code || message) {
          const code: FailCode = f.code === GUEST_FREE_LIMIT
            ? "guest_limit"
            : /turnstile|人机验证/i.test(message)
              ? "captcha"
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
        navigate("/result", { state: { images, imageData: images[0], result, appendTo }, replace: true });
      } catch {
        fail("unavailable");
      }
    } finally {
      clearTimeout(t3);
      clearTimeout(t6);
      runningRef.current = false;
    }
  }, [images, locale, navigate, appendTo]);

  analyzeRef.current = analyze;

  // Auto-start when an entry point already handed over photos.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (phase !== "analyzing" || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void analyze();
  }, [phase, analyze]);

  const startAnalysis = () => {
    if (images.length === 0) return;
    autoStartedRef.current = false;
    setPhase("analyzing");
  };

  const addPhoto = async (fromCamera: boolean) => {
    if (images.length >= MAX_PHOTOS) { setLimitPrompt(true); return; }
    const data = fromCamera ? await takePhoto() : await pickPhoto();
    if (data) setImages((prev) => (prev.length < MAX_PHOTOS ? [...prev, data] : prev));
  };

  const replaceOldest = async () => {
    setLimitPrompt(false);
    const data = await takePhoto();
    if (data) setImages((prev) => [...prev.slice(1), data]);
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    navigate("/", { replace: true });
  };

  const failureText = failure === "signin"
    ? t.scanCloudNeedsSignIn
    : failure === "captcha"
      ? t.captchaClosed
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
        {appendTo && (
          <p className="mt-2 text-sm font-semibold text-primary">{t.appendBanner(appendTo.food)}</p>
        )}
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
          {limitPrompt && (
            <div role="alert" className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-sm text-card-foreground leading-relaxed">{t.scanLimitReached(MAX_PHOTOS)}</p>
              <div className="flex gap-2">
                <button onClick={replaceOldest} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold text-card-foreground">{t.scanReplaceOldest}</button>
                <button onClick={() => setLimitPrompt(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground">{t.cancel}</button>
              </div>
            </div>
          )}
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
              className="py-3 rounded-xl border border-border text-sm font-semibold text-card-foreground flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Camera className="w-4 h-4" /> {images.length === 0 ? t.scanTakePhotoBtn : t.scanTakeAnother}
            </button>
            <button
              onClick={() => addPhoto(false)}
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
            {failure === "guest_limit" ? t.guestFreeLimit : t.analysisFailedTitle}
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
          ) : failure === "captcha" ? (
            <button onClick={() => { setFailure(null); setShowCaptcha(true); }} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {t.retry}
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
      ) : showCaptcha ? (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <p className="text-base font-semibold text-card-foreground">{t.captchaPrompt}</p>
          <TurnstileWidget
            siteKey={readTurnstileSiteKey()}
            onToken={(token) => {
              captchaTokenRef.current = token;
              setShowCaptcha(false);
              void analyzeRef.current();
            }}
            onError={() => {
              setShowCaptcha(false);
              fail("captcha");
            }}
          />
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
        onAgree={() => {
          if (consentUserId) setAiConsent(consentUserId);
          setShowConsent(false);
          void analyzeRef.current();
        }}
        onDecline={() => {
          setShowConsent(false);
          autoStartedRef.current = false;
          setPhase("capture");
        }}
      />
    </div>
  );
};

export default Scan;
