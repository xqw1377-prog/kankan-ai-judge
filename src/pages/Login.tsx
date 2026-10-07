import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { clearGuestMode, markGuestMode } from "@/lib/localData";
import { commitVerifiedUpgrade, noteVerificationHandoff, readUpgradeHandoff, upgradeProfileSaved } from "@/lib/guestHandoff";
import { handoffExistingAccountSignIn } from "@/lib/guestClaim";
import { profileSaveBody } from "@/lib/serverWrites";
import {
  needsPasswordSetup,
  requestAnonymousEmailUpgrade,
  submitUpgradePassword,
  upgradeEmailRedirect,
} from "@/lib/anonymousUpgrade";

type Phase = "signin" | "signup" | "forgot" | "set-password";
type SessionUser = { id: string; is_anonymous?: boolean; email?: string | null };

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const upgrade = Boolean((location.state as { upgrade?: boolean } | null)?.upgrade);

  const [phase, setPhase] = useState<Phase>(upgrade ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [pendingVerification, setPendingVerification] = useState(
    () => readUpgradeHandoff()?.state === "pending_verification",
  );

  useEffect(() => {
    let live = true;
    const apply = (user: SessionUser | null) => {
      if (!live) return;
      setSessionUser(user);
      if (user && needsPasswordSetup({ userId: user.id, isAnonymous: user.is_anonymous === true })) {
        setPhase("set-password");
      }
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);

  const emailOnly = phase === "signup" && (upgrade || sessionUser?.is_anonymous === true);
  const showEmail = phase !== "set-password";
  const showPassword = phase === "signin" || phase === "set-password" || (phase === "signup" && !emailOnly);

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
    if (!email) return;
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const anonymousUser = sessionData.session?.user;
    if (anonymousUser?.is_anonymous || upgrade) {
      if (!anonymousUser?.is_anonymous) {
        setLoading(false);
        toast({ title: t.loginError, description: t.loginUpgradeNeedsTrial, variant: "destructive" });
        return;
      }
      const outcome = await requestAnonymousEmailUpgrade({
        email,
        redirectTo: upgradeEmailRedirect(window.location.origin),
        anonymousUserId: anonymousUser.id,
        updateEmail: async (nextEmail, redirectTo) => {
          const { data, error } = await supabase.auth.updateUser(
            { email: nextEmail },
            { emailRedirectTo: redirectTo },
          );
          return {
            userId: data.user?.id ?? null,
            isAnonymous: data.user?.is_anonymous !== false,
            error: error?.message ?? null,
          };
        },
      });
      setLoading(false);
      if (outcome.status === "error") {
        toast({ title: t.loginError, description: outcome.message, variant: "destructive" });
        return;
      }
      if (outcome.status === "rejected") {
        toast({ title: t.loginError, description: t.guestClaimIssueFailed, variant: "destructive" });
        return;
      }
      noteVerificationHandoff(anonymousUser.id);
      if (outcome.status === "verification_sent") {
        setPendingVerification(true);
        toast({ title: t.loginVerificationPending, description: t.loginVerificationPendingDesc });
        return;
      }
      setPhase("set-password");
      setPassword("");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      toast({ title: t.loginError, description: t.loginPasswordMinLength, variant: "destructive" });
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
      setPhase("signin");
    }
  };

  const handleSetPassword = async () => {
    setLoading(true);
    const outcome = await submitUpgradePassword({
      password,
      updatePassword: async (nextPassword) => {
        const { error } = await supabase.auth.updateUser({ password: nextPassword });
        return { error: error?.message ?? null };
      },
    });
    setLoading(false);
    if (outcome.status === "too_short") {
      toast({ title: t.loginError, description: t.loginPasswordMinLength, variant: "destructive" });
      return;
    }
    if (outcome.status === "error") {
      toast({ title: t.loginError, description: outcome.message, variant: "destructive" });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    const adopted = await commitVerifiedUpgrade({
      userId: user?.id ?? null,
      isAnonymous: user?.is_anonymous === true,
    }, async (profile) => {
      const saved = await supabase.functions.invoke("save-profile", {
        body: profileSaveBody({ ...profile } as Record<string, unknown>),
      });
      return upgradeProfileSaved(saved.data, saved.error);
    });
    if (adopted.status === "pending_sync") {
      toast({ title: t.profileSaveFailed, variant: "destructive" });
      return;
    }
    toast({ title: t.loginSetPasswordSaved, description: t.loginWelcomeBack });
    navigate("/", { replace: true });
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
      setPhase("signin");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "signin") handleSignIn();
    else if (phase === "signup") handleSignUp();
    else if (phase === "set-password") handleSetPassword();
    else handleForgotPassword();
  };

  const title = phase === "forgot"
    ? t.loginResetPasswordTitle
    : phase === "set-password"
      ? t.loginSetPasswordTitle
      : phase === "signup"
        ? t.loginSignUp
        : t.loginSignIn;
  const submitLabel = loading
    ? t.loginLoading
    : phase === "forgot"
      ? t.loginResetPasswordTitle
      : phase === "set-password"
        ? t.loginSetPasswordTitle
        : phase === "signup" && emailOnly
          ? t.loginSendVerification
          : phase === "signup"
            ? t.loginSignUp
            : t.loginSignIn;

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[100px] bg-primary/8" />
      </div>

      <div className="pt-[max(3rem,env(safe-area-inset-top))] px-6 text-center relative z-10">
        <div className="mx-auto mb-4 flex flex-col items-center gap-1">
          <img src="/favicon.png" alt="KanKan" width={72} height={72} className="h-[72px] w-[72px] rounded-2xl shadow-card" />
        </div>
        <h1 className="text-2xl font-black text-card-foreground tracking-tight">KanKan</h1>
        <p className="text-xs text-muted-foreground/60 mt-1 font-mono tracking-widest">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 shadow-card border border-border/30">
            <h2 className="text-lg font-bold text-card-foreground mb-1 text-center">
              {title}
            </h2>
            {upgrade && phase === "signup" && (
              <p className="text-xs text-muted-foreground text-center mt-1">{t.guestFreeLimit}</p>
            )}
            {emailOnly && (
              <p className="text-xs text-muted-foreground text-center mt-2">{t.loginUpgradeEmailHint}</p>
            )}
            {phase === "set-password" && (
              <p className="text-sm text-card-foreground text-center mt-2">{t.loginSetPasswordHint}</p>
            )}
            {pendingVerification && phase !== "set-password" && (
              <p className="text-sm text-card-foreground text-center mt-2">{t.loginVerificationPendingDesc}</p>
            )}
            {phase === "forgot" && (
              <p className="text-xs text-muted-foreground/60 mb-4 text-center">{t.loginResetPasswordDesc}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {showEmail && (
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-card-foreground">
                    {t.loginEmailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t.loginEmailPlaceholder}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-base text-card-foreground outline-none border border-border focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {showPassword && (
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-card-foreground">
                    {t.loginPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="login-password"
                      type="password"
                      autoComplete={phase === "signin" ? "current-password" : "new-password"}
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

              {phase === "signin" && (
                <div className="text-right">
                  <button type="button" onClick={() => setPhase("forgot")} className="text-xs text-primary hover:underline">
                    {t.loginForgotPassword}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : null}
                {submitLabel}
              </button>
            </form>

            <div className="mt-4 text-center">
              {phase === "forgot" || phase === "set-password" ? (
                <button onClick={() => setPhase("signin")} type="button" className="min-h-11 px-3 text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                  <ArrowLeft className="w-3 h-3" /> {t.loginSwitchToSignIn}
                </button>
              ) : (
                <button
                  onClick={() => setPhase(phase === "signin" ? "signup" : "signin")}
                  type="button"
                  className="min-h-11 px-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {phase === "signin" ? t.loginSwitchToSignUp : t.loginSwitchToSignIn}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-[max(2rem,env(safe-area-inset-bottom))] px-6 text-center relative z-10 space-y-3">
        <button
          type="button"
          onClick={() => {
            markGuestMode();
            navigate("/", { replace: true });
          }}
          className="min-h-11 px-4 text-sm font-semibold text-card-foreground hover:text-primary transition-colors">
          {t.loginSkip}
        </button>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t.loginTerms}{" "}
          <Link to="/terms" className="text-primary underline underline-offset-2">{t.termsOfService}</Link>
          {" "}{t.loginTermsAnd}{" "}
          <Link to="/privacy" className="text-primary underline underline-offset-2">{t.privacyPolicy}</Link>
        </p>
      </div>
    </div>
  );
}
