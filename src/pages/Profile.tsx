import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  sugar_control: "控糖",
  maintain: "保持",
};

const Profile = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { meals } = useMeals();

  if (!profile) return null;

  const nickname = profile.gender === "female" ? "小丽" : "小张";
  const genderLabel = profile.gender === "female" ? "女" : "男";

  // Calculate streaks
  const uniqueDays = new Set(meals.map(m => new Date(m.recorded_at).toDateString())).size;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold ml-2">我的</h1>
      </header>

      {/* Profile card */}
      <section className="px-5 mb-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              👤
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{nickname}</h2>
              <p className="text-sm text-muted-foreground">
                {profile.age}岁 · {genderLabel} · {profile.height_cm}cm / {profile.weight_kg}kg
              </p>
              <p className="text-sm text-primary font-semibold mt-0.5">
                目标：{GOAL_LABELS[profile.goal || "maintain"]}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-semibold active:scale-[0.98] transition-all"
          >
            编辑资料
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">健康资产</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-primary">{uniqueDays}</p>
            <p className="text-xs text-muted-foreground">记录天数</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-primary">{meals.length}</p>
            <p className="text-xs text-muted-foreground">总餐数</p>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="px-5 pb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">设置</h3>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {["过敏原管理", "提醒设置", "帮助与反馈", "关于我们"].map(item => (
            <button key={item} className="w-full flex items-center justify-between px-4 py-3.5 text-sm">
              <span>{item}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Profile;
