import { useNavigate } from "react-router-dom";
import { Utensils } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background px-8">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Utensils className="w-12 h-12 text-primary" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-foreground">KANKAN</h1>
          <p className="text-muted-foreground mt-2 text-base">你的AI饮食日记</p>
        </div>
      </div>

      <div className="mt-16 w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform shadow-soft"
        >
          立即体验
        </button>
        <button className="text-muted-foreground text-sm py-2 opacity-50">
          已有记录？恢复数据
        </button>
      </div>
    </div>
  );
};

export default Welcome;
