import { Home, ClipboardList, User, Camera } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const leftTabs = [
    { path: "/", icon: Home, label: t.navHome },
    { path: "/history", icon: ClipboardList, label: t.navHistory },
  ];
  const rightTabs = [
    { path: "/profile", icon: User, label: t.navProfile },
  ];

  const hiddenPaths = ["/onboarding", "/scan", "/result", "/edit-ingredients", "/welcome", "/meal/", "/audit", "/login", "/reset-password"];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  const renderTab = ({ path, icon: Icon, label }: { path: string; icon: typeof Home; label: string }) => {
    const active = location.pathname === path;
    return (
      <button
        key={path}
        onClick={() => navigate(path)}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-4 py-1 transition-colors ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[13px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <nav aria-label="KanKan" className="shrink-0 flex items-center justify-around glass-strong py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {leftTabs.map(renderTab)}
      <button
        onClick={() => navigate("/scan")}
        aria-label={t.navScan}
        className="flex min-h-11 min-w-11 flex-col items-center gap-0.5 px-4 py-1 transition-colors text-muted-foreground"
      >
        <span className="flex items-center justify-center w-11 h-11 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background active:scale-95 transition-transform">
          <Camera className="w-5 h-5" />
        </span>
        <span className="text-[13px] font-medium">{t.navScan}</span>
      </button>
      {rightTabs.map(renderTab)}
    </nav>
  );
};

export default BottomNav;
