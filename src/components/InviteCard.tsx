import { useRef, useState, useCallback, forwardRef } from "react";
import { Users, X, Download, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface InviteCardProps {
  food: string;
  imageData?: string;
  calories: number;
}

const InviteCardContent = forwardRef<HTMLDivElement, { food: string; imageData?: string; calories: number; locale: string }>(
  ({ food, imageData, calories, locale }, ref) => {
    const isEn = locale === "en-US";
    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: 480,
          background: "linear-gradient(165deg, #0A0C10 0%, #121620 50%, #0A0C10 100%)",
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
        }}
      >
        {/* Gold mesh overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 30% 20%, rgba(212,175,55,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(212,175,55,0.05) 0%, transparent 50%)",
          }}
        />

        {/* Food image */}
        {imageData && (
          <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden" }}>
            <img
              src={imageData}
              alt={food}
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, transparent 30%, #0A0C10 100%)",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, padding: "20px 24px", textAlign: "center" }}>
          {!imageData && <div style={{ height: 60 }} />}
          <div
            style={{
              fontSize: 11,
              color: "#D4AF37",
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            {isEn ? "TABLE INVITATION" : "餐桌邀请函"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#E2E8F0", marginBottom: 8 }}>
            {food}
          </div>
          <div style={{ fontSize: 13, color: "#A0AEC0", marginBottom: 24 }}>
            {isEn ? `${calories} kcal · Claim your portion` : `${calories} kcal · 来认领你的份额`}
          </div>

          {/* Invite message */}
          <div
            style={{
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 12,
              padding: "16px 20px",
              background: "rgba(212,175,55,0.05)",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 15, color: "#E2E8F0", fontWeight: 600, lineHeight: 1.6 }}>
              {isEn
                ? "Join my table & track what you eat together!"
                : "来我的餐桌，一起记录这顿饭吧！"}
            </div>
          </div>

          {/* Brand bar */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              right: 0,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: "#D4AF37", letterSpacing: 3, fontWeight: 700 }}>
              KANKAN AI
            </div>
            <div style={{ fontSize: 8, color: "#A0AEC0", letterSpacing: isEn ? 2 : 4, marginTop: 4 }}>
              {isEn ? "Data-driven Dining Laboratory" : "数 字 化 饮 食 实 验 室"}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InviteCardContent.displayName = "InviteCardContent";

export default function InviteButton({ food, imageData, calories }: InviteCardProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    setOpen(true);
    // Wait for render
    await new Promise((r) => setTimeout(r, 100));
    if (!cardRef.current) { setGenerating(false); return; }
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      setImage(canvas.toDataURL("image/png"));
    } catch {
      toast({ title: t.generateFailed, description: t.retry });
      setOpen(false);
    } finally {
      setGenerating(false);
    }
  }, [toast, t]);

  const handleDownload = useCallback(() => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `KanKan-invite-${Date.now()}.png`;
    link.click();
    toast({ title: t.savedToAlbum });
  }, [image, toast, t]);

  const handleShare = useCallback(async () => {
    if (!image) return;
    try {
      const res = await fetch(image);
      const blob = await res.blob();
      const file = new File([blob], `KanKan-invite.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `KanKan - ${food}`, files: [file] });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  }, [image, food, handleDownload]);

  return (
    <>
      <button
        onClick={generate}
        disabled={generating}
        className="w-full py-3.5 rounded-2xl border border-primary/30 bg-primary/5 text-primary font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" />
        {generating ? t.generating : t.inviteTablemate}
      </button>

      {/* Hidden card for capture */}
      <div style={{ position: "fixed", left: -9999, top: 0 }}>
        <InviteCardContent ref={cardRef} food={food} imageData={imageData} calories={calories} locale={locale} />
      </div>

      {/* Preview modal */}
      {open && image && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <button onClick={() => { setOpen(false); setImage(null); }} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
          <div className="px-6 w-full max-w-sm">
            <img src={image} alt="invite" className="w-full rounded-2xl shadow-soft mb-6" style={{ maxHeight: "60vh", objectFit: "contain" }} />
            <p className="text-center text-xs text-muted-foreground mb-5">{t.longPressToSave}</p>
            <div className="flex gap-3">
              <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl border border-border glass font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate text-card-foreground">
                <Download className="w-4 h-4 shrink-0" /> {t.saveToAlbum}
              </button>
              <button onClick={handleShare} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 truncate">
                <Share2 className="w-4 h-4 shrink-0" /> {t.shareToFriend}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
