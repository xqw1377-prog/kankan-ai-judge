import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { clearGuestMode, markGuestMode } from "@/lib/localData";
import { adoptVerifiedUpgrade, noteVerificationHandoff, readUpgradeHandoff } from "@/lib/guestHandoff";
import { handoffExistingAccountSignIn } from "@/lib/guestClaim";
import { profileSaveBody } from "@/lib/serverWrites";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const upgrade = Boolean((location.state as { upgrade?: boolean } | null)?.upgrade);

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(upgrade ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(
    () => readUpgradeHandoff()?.state === "pending_verification",
  );

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    const outcome = await handoffExistingAccountSignIn({
      getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return {
          userId: data.session?.user?.id ?? null,
          isAnonymous: data.session?.user?.is_anonymous === true,
        };
      },
      issueToken: async () => {
        const issued = await supabase.functions.invoke("claim-guest-meal", { body: { action: "issue" } });
        const token = issued.data && typeof issued.data === "object" ? (issued.data as { token?: unknown }).token : null;
        return typeof token === "string" ? token : null;
      },
      signIn: async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { userId: data.user?.id ?? null, error: error?.message ?? null };
      },
      claim: async (token) => {
        const result = await supabase.functions.invoke("claim-guest-meal", { body: { action: "claim", token } });
        const status = result.data && typeof result.data === "object" ? (result.data as { status?: unknown }).status : "";
        return { error: result.error, status };
      },
    });
    setLoading(false);
    if (outcome.status === "issue_failed") {
      toast({ title: t.loginError, description: t.guestClaimIssueFailed, variant: "destructive" });
      return;
    }
    if (outcome.status === "signin_failed") {
      toast({ title: t.loginError, description: outcome.message, variant: "destructive" });
      return;
    }
    const claimed = outcome.status === "claimed" || outcome.status === "signed_in";
    toast({
      title: claimed ? t.loginSuccess : t.guestClaimPending,
      description: claimed ? t.loginWelcomeBack : t.guestClaimPendingDesc,
    });
    navigate("/", { replace: true });
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      toast({ title: t.loginError, description: t.loginPasswordMinLength, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const anonymousUser = sessionData.session?.user;
    if (anonymousUser?.is_anonymous) {
      const { data, error } = await supabase.auth.updateUser({ email, password });
      setLoading(false);
      if (error) {
        toast({ title: t.loginError, description: error.message, variant: "destructive" });
        return;
      }
      if (!data.user || data.user.id !== anonymousUser.id) {
        toast({ title: t.loginError, description: t.guestClaimIssueFailed, variant: "destructive" });
        return;
      }
      noteVerificationHandoff(anonymousUser.id);
      if (data.user.is_anonymous) {
        setPendingVerification(true);
        toast({ title: t.loginVerificationPending, description: t.loginVerificationPendingDesc });
        return;
      }
      const adopted = adoptVerifiedUpgrade({ userId: data.user.id, isAnonymous: false });
      if (adopted.status === "adopted" && !adopted.already && adopted.profile) {
        await supabase.functions.invoke("save-profile", {
          body: profileSaveBody({ ...adopted.profile } as Record<string, unknown>),
        });
      }
      toast({ title: t.loginSignUpSuccess, description: t.loginWelcomeBack });
      navigate("/", { replace: true });
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: t.loginError, description: error.message, variant: "destructive" });
    } else {
      clearGuestMode();
      toast({ title: t.loginSignUpSuccess, description: t.loginSignUpSuccessDesc });
      setMode("signin");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: t.loginError, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.loginResetPasswordSent, description: t.loginResetPasswordSentDesc });
      setMode("signin");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") handleSignIn();
    else if (mode === "signup") handleSignUp();
    else handleForgotPassword();
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[100px] bg-primary/8" />
      </div>

      {/* Header */}
      <div className="pt-[max(3rem,env(safe-area-inset-top))] px-6 text-center relative z-10">
        <div className="mx-auto mb-4 flex flex-col items-center gap-1">
          <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden="true">
            <path fill="hsl(42 88% 52%)" d="M32 20C24 8 8 4 4 14c6 2 16 6 28 6z" />
            <path fill="hsl(36 78% 42%)" d="M32 20C22 28 8 34 6 24c8-1 16-3 26-4z" />
            <path fill="hsl(42 88% 52%)" d="M32 20c8-12 24-16 28-6-6 2-16 6-28 6z" />
            <path fill="hsl(36 78% 42%)" d="M32 20c10 8 24 14 26 4-8-1-16-3-26-4z" />
            <ellipse cx="32" cy="20" rx="1.6" ry="7" fill="hsl(28 35% 22%)" />
          </svg>
          <span className="text-lg font-black tracking-[0.28em] text-card-foreground">KK</span>
        </div>
        <h1 className="text-2xl font-black text-card-foreground tracking-tight">KanKan</h1>
        <p className="text-xs text-muted-foreground/60 mt-1 font-mono tracking-widest">
          {t.loginSubtitle}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 shadow-card border border-border/30">
            <h2 className="text-lg font-bold text-card-foreground mb-1 text-center">
              {mode === "forgot" ? t.loginResetPasswordTitle : mode === "signup" ? t.loginSignUp : t.loginSignIn}
            </h2>
            {upgrade && mode === "signup" && (
              <p className="text-xs text-muted-foreground text-center mt-1">{t.guestFreeLimit}</p>
            )}
            {pendingVerification && (
              <p className="text-sm text-card-foreground text-center mt-2">{t.loginVerificationPendingDesc}</p>
            )}
            {mode === "forgot" && (
              <p className="text-xs text-muted-foreground/60 mb-4 text-center">{t.loginResetPasswordDesc}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-card-foreground">
                  {t.loginEmailLabel}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t.loginEmailPlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-base text-card-foreground outline-none border border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password (hidden in forgot mode) */}
              {mode !== "forgot" && (
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-card-foreground">
                    {t.loginPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t.loginPasswordPlaceholder}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-base text-card-foreground outline-none border border-border focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Forgot password link */}
              {mode === "signin" && (
                <div className="text-right">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    {t.loginForgotPassword}
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : null}
                {loading
                  ? t.loginLoading
                  : mode === "forgot"
                    ? t.loginResetPasswordTitle
                    : mode === "signup"
                      ? t.loginSignUp
                      : t.loginSignIn}
              </button>
            </form>

            {/* Mode switch */}
            <div className="mt-4 text-center">
              {mode === "forgot" ? (
                <button onClick={() => setMode("signin")} className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                  <ArrowLeft className="w-3 h-3" /> {t.loginSwitchToSignIn}
                </button>
              ) : (
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {mode === "signin" ? t.loginSwitchToSignUp : t.loginSwitchToSignIn}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: skip + terms */}
      <div className="pb-[max(2rem,env(safe-area-inset-bottom))] px-6 text-center relative z-10 space-y-3">
        <button
          type="button"
          onClick={() => {
            markGuestMode();
            navigate("/", { replace: true });
          }}
          className="text-sm font-semibold text-card-foreground hover:text-primary transition-colors">
          {t.loginSkip}
        </button>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t.loginTerms}
        </p>
      </div>
    </div>
  );
}
