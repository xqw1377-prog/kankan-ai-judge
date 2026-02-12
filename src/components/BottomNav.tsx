import { Home, ClipboardList, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const tabs = [
    { path: "/", icon: Home, label: t.navHome },
    { path: "/history", icon: ClipboardList, label: t.navHistory },
    { path: "/profile", icon: User, label: t.navProfile },
  ];

  const hiddenPaths = ["/onboarding", "/scan", "/result", "/edit-ingredients", "/welcome", "/meal/"];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav className="shrink-0 flex items-center justify-around glass-strong py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
