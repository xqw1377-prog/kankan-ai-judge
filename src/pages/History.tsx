import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { useMeals } from "@/hooks/useMeals";
import { getMealTypeLabel } from "@/lib/nutrition";

const History = () => {
  const navigate = useNavigate();
  const { meals, loading } = useMeals();

  // Group by date
  const grouped = meals.reduce((acc, meal) => {
    const date = new Date(meal.recorded_at).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, typeof meals>);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <h1 className="text-xl font-bold">饮食记录</h1>
      </header>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">暂无记录，拍下第一餐吧</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> 去拍照
          </button>
        </div>
      ) : (
        <div className="px-5 pb-6 space-y-5">
          {Object.entries(grouped).map(([date, dateMeals]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📅 {date}</p>
              <div className="space-y-2">
                {dateMeals.map(meal => (
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
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{meal.calories}kcal</span>
                      <span className="text-muted-foreground ml-1">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
