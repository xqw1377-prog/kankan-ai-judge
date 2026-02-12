import { Home, ClipboardList, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/history", icon: ClipboardList, label: "记录" },
  { path: "/profile", icon: User, label: "我的" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on onboarding and scan pages
  const hiddenPaths = ["/onboarding", "/scan", "/result"];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav className="shrink-0 flex items-center justify-around border-t border-border bg-card py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
