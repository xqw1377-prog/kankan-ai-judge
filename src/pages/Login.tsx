import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

// Simulated WeChat QR code SVG
function WeChatQR({ size = 160 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Fake QR pattern */}
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <rect width="100" height="100" rx="8" fill="#1a1c24" />
        {/* Grid pattern simulating QR */}
        {Array.from({ length: 10 }).map((_, row) =>
          Array.from({ length: 10 }).map((_, col) => {
            const filled = (row + col) % 3 !== 0 || (row < 3 && col < 3) || (row < 3 && col > 6) || (row > 6 && col < 3);
            return filled ? (
              <rect key={`${row}-${col}`} x={10 + col * 8} y={10 + row * 8} width="7" height="7" rx="1"
                fill="#07C160" opacity={0.15 + Math.random() * 0.6}
              />
            ) : null;
          })
        )}
        {/* WeChat logo center */}
        <circle cx="50" cy="50" r="14" fill="#1a1c24" />
        <text x="50" y="55" textAnchor="middle" fontSize="18" fill="#07C160">💬</text>
        {/* Corner markers */}
        {[[12, 12], [12, 78], [78, 12]].map(([cx, cy], i) => (
          <g key={i}>
            <rect x={cx - 8} y={cy - 8} width="16" height="16" rx="2" fill="none" stroke="#07C160" strokeWidth="2" opacity="0.8" />
            <rect x={cx - 4} y={cy - 4} width="8" height="8" rx="1" fill="#07C160" opacity="0.6" />
          </g>
        ))}
      </svg>
      {/* Scanning animation */}
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{
            background: "linear-gradient(90deg, transparent, #07C160, transparent)",
            animation: "wechat-scan 2.5s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes wechat-scan {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  );
}

// Google G logo
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [wechatStep, setWechatStep] = useState<"idle" | "scanning" | "confirming" | "success">("idle");
  const isZh = locale === "zh-CN";

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Simulate Google login
    await new Promise(r => setTimeout(r, 1500));
    toast({ title: t.loginSuccess, description: t.loginWelcomeBack });
    setLoading(false);
    navigate("/", { replace: true });
  };

  const handleWeChatLogin = () => {
    setWechatStep("scanning");
    // Simulate scanning → confirming → success
    setTimeout(() => setWechatStep("confirming"), 2500);
    setTimeout(() => {
      setWechatStep("success");
      toast({ title: t.loginSuccess, description: t.loginWelcomeBack });
      setTimeout(() => navigate("/", { replace: true }), 800);
    }, 4500);
  };

  const handleSkip = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[100px]"
          style={{ background: isZh ? "rgba(7,193,96,0.08)" : "rgba(66,133,244,0.08)" }} />
      </div>

      {/* Header */}
      <div className="pt-[max(3rem,env(safe-area-inset-top))] px-6 text-center relative z-10">
        {/* Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, #D4AF37, #F5D060)",
            boxShadow: "0 8px 32px rgba(212,175,55,0.3)",
          }}>
          <span className="text-2xl font-black text-[#0A0C10]">K</span>
        </div>
        <h1 className="text-2xl font-black text-card-foreground tracking-tight">KanKan</h1>
        <p className="text-xs text-muted-foreground/60 mt-1 font-mono tracking-widest">
          {t.loginSubtitle}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {isZh ? (
          /* ── 微信登录 ── */
          <div className="w-full max-w-sm space-y-6">
            {wechatStep === "idle" && (
              <div className="animate-fade-in text-center space-y-5">
                <div className="glass rounded-2xl p-6 shadow-card border border-border/30">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-2xl">💬</span>
                    <h2 className="text-lg font-bold text-card-foreground">{t.loginWechatTitle}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mb-5">{t.loginWechatDesc}</p>
                  <button
                    onClick={handleWeChatLogin}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      background: "#07C160",
                      boxShadow: "0 4px 16px rgba(7,193,96,0.3)",
                    }}
                  >
                    <span className="text-lg">💬</span>
                    {t.loginWechatBtn}
                  </button>
                </div>
              </div>
            )}

            {wechatStep === "scanning" && (
              <div className="animate-fade-in text-center space-y-4">
                <div className="glass rounded-2xl p-6 shadow-card border border-border/30">
                  <p className="text-sm font-semibold text-card-foreground mb-4">{t.loginWechatScanning}</p>
                  <div className="flex justify-center mb-3">
                    <WeChatQR size={180} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 animate-pulse">{t.loginWechatScanHint}</p>
                </div>
              </div>
            )}

            {wechatStep === "confirming" && (
              <div className="animate-fade-in text-center space-y-4">
                <div className="glass rounded-2xl p-6 shadow-card border border-[#07C160]/30">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#07C160]/10 flex items-center justify-center mb-3">
                    <span className="text-3xl animate-pulse">📱</span>
                  </div>
                  <p className="text-sm font-bold text-card-foreground">{t.loginWechatConfirming}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">{t.loginWechatConfirmHint}</p>
                  {/* Loading dots */}
                  <div className="flex justify-center gap-1.5 mt-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#07C160]"
                        style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {wechatStep === "success" && (
              <div className="animate-scale-in text-center space-y-4">
                <div className="glass rounded-2xl p-6 shadow-card border border-[#07C160]/30">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#07C160]/15 flex items-center justify-center mb-3">
                    <span className="text-3xl">✅</span>
                  </div>
                  <p className="text-sm font-bold text-[#07C160]">{t.loginSuccess}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Google 登录 ── */
          <div className="w-full max-w-sm space-y-6 animate-fade-in">
            <div className="glass rounded-2xl p-6 shadow-card border border-border/30 text-center">
              <h2 className="text-lg font-bold text-card-foreground mb-2">{t.loginGoogleTitle}</h2>
              <p className="text-xs text-muted-foreground/60 mb-5">{t.loginGoogleDesc}</p>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-[#3c4043] font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-[#dadce0] hover:bg-gray-50 disabled:opacity-50"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleLogo />
                )}
                {loading ? t.loginLoading : t.loginGoogleBtn}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: skip + terms */}
      <div className="pb-[max(2rem,env(safe-area-inset-bottom))] px-6 text-center relative z-10 space-y-3">
        <button onClick={handleSkip}
          className="text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors font-mono">
          {t.loginSkip}
        </button>
        <p className="text-[8px] text-muted-foreground/25 leading-relaxed">
          {t.loginTerms}
        </p>
      </div>
    </div>
  );
}
