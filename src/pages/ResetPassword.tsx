import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: t.loginError, description: t.loginPasswordMinLength, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: t.loginError, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.loginNewPasswordSaved });
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background items-center justify-center px-6">
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-card border border-border/30">
        <h2 className="text-lg font-bold text-card-foreground mb-4 text-center">{t.loginNewPassword}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.loginNewPasswordPlaceholder}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-sm text-card-foreground outline-none border border-border focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
          >
            {loading ? t.loginLoading : t.loginNewPassword}
          </button>
        </form>
      </div>
    </div>
  );
}
