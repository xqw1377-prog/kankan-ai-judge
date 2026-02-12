import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background px-8">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-4xl font-black text-primary text-glow-gold">K</span>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-primary text-glow-gold">{t.appName}</h1>
          <p className="text-muted-foreground mt-2 text-base tracking-widest">{t.welcomeSubtitle}</p>
        </div>
      </div>
      <div className="mt-16 w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform shadow-soft"
        >
          {t.welcomeStart}
        </button>
        <button className="text-muted-foreground text-sm py-2 opacity-50">
          {t.welcomeRestore}
        </button>
      </div>
    </div>
  );
};

export default Welcome;
