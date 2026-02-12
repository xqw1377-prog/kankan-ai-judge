import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";
import NutritionBar from "@/components/NutritionBar";
import { getMealTypeLabel } from "@/lib/nutrition";

const Index = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { todayMeals, todayTotals, loading: mealsLoading } = useMeals();
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect to welcome/onboarding if needed
  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/welcome", { replace: true });
    } else if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const handleCapture = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target?.result as string;
      navigate("/scan", { state: { imageData } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (profileLoading || mealsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const nickname = profile.gender === "female" ? "小丽" : "小张";
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "早安" : hour < 14 ? "午安" : hour < 18 ? "下午好" : "晚上好";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}，</p>
            <h1 className="text-xl font-bold">{nickname}</h1>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <span className="text-lg">👤</span>
          </button>
        </div>
      </header>

      {/* Today's progress */}
      <section className="px-5 mb-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">今日目标</h2>
          <div className="space-y-3">
            <NutritionBar label="能量" current={todayTotals.calories} target={profile.targets.calories} unit="kcal" />
            <NutritionBar label="蛋白" current={todayTotals.protein_g} target={profile.targets.protein_g} unit="g" />
            <NutritionBar label="脂肪" current={todayTotals.fat_g} target={profile.targets.fat_g} unit="g" />
            <NutritionBar label="碳水" current={todayTotals.carbs_g} target={profile.targets.carbs_g} unit="g" />
          </div>
        </div>
      </section>

      {/* Camera button */}
      <section className="flex flex-col items-center mb-6">
        <button
          onClick={handleCapture}
          className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft animate-pulse-soft active:scale-95 transition-transform"
        >
          <Camera className="w-8 h-8" />
        </button>
        <p className="text-sm text-muted-foreground mt-3">拍下你的餐食</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </section>

      {/* Recent meals */}
      <section className="px-5 pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">最近记录</h2>
        {todayMeals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">暂无记录，拍下第一餐吧</p>
        ) : (
          <div className="space-y-2">
            {todayMeals.slice(0, 3).map(meal => (
              <button
                key={meal.id}
                onClick={() => navigate(`/meal/${meal.id}`)}
                className="w-full flex items-center justify-between bg-card rounded-xl px-4 py-3 shadow-card active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">{meal.food_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getMealTypeLabel(meal.meal_type)} · {new Date(meal.recorded_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{meal.calories}kcal</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
