import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-card-foreground">404</h1>
        <p className="mb-1 text-lg font-semibold text-card-foreground">{t.notFoundTitle}</p>
        <p className="mb-4 text-sm text-muted-foreground">{t.notFoundBody}</p>
        <button onClick={() => navigate("/")} className="text-primary underline">
          {t.backHome}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
