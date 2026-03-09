import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t.loginError, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.loginSuccess, description: t.loginWelcomeBack });
      navigate("/", { replace: true });
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      toast({ title: t.loginError, description: t.loginPasswordMinLength, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: t.loginError, description: error.message, variant: "destructive" });
    } else {
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
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)",
          }}
        >
          <span className="text-2xl font-black text-primary-foreground">K</span>
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
            {mode === "forgot" && (
              <p className="text-xs text-muted-foreground/60 mb-4 text-center">{t.loginResetPasswordDesc}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-sm text-card-foreground outline-none border border-border focus:border-primary transition-colors"
                />
              </div>

              {/* Password (hidden in forgot mode) */}
              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t.loginPasswordPlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-sm text-card-foreground outline-none border border-border focus:border-primary transition-colors"
                  />
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
        <button onClick={() => navigate("/", { replace: true })}
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
