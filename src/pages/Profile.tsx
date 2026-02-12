import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Award, Calendar, Utensils } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMeals } from "@/hooks/useMeals";

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  sugar_control: "控糖",
  maintain: "保持",
};

// Simple health score calculation
function calcHealthScore(totalMeals: number, uniqueDays: number): { score: number; level: string; levelDesc: string } {
  const base = Math.min(totalMeals * 50, 3000) + uniqueDays * 100;
  const score = Math.min(base, 9999);
  let level: string, levelDesc: string;
  if (score >= 5000) { level = "黄金"; levelDesc = "坚持不懈"; }
  else if (score >= 2000) { level = "白银"; levelDesc = "再接再厉"; }
  else if (score >= 500) { level = "青铜"; levelDesc = "初露锋芒"; }
  else { level = "新手"; levelDesc = "刚刚起步"; }
  return { score, level, levelDesc };
}

// Calculate consecutive days streak
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const uniqueSorted = [...new Set(dates.map(d => new Date(d).toDateString()))]
    .map(d => new Date(d).getTime())
    .sort((a, b) => b - a);

  let streak = 1;
  const DAY = 86400000;
  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    if (uniqueSorted[i] - uniqueSorted[i + 1] <= DAY * 1.5) {
      streak++;
    } else break;
  }
  return streak;
}

const Profile = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { meals } = useMeals();

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">请先完成引导</p>
        <button onClick={() => navigate("/welcome")} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold">
          开始体验
        </button>
      </div>
    );
  }

  const nickname = profile.gender === "female" ? "小丽" : "小张";
  const genderLabel = profile.gender === "female" ? "女" : "男";
  const uniqueDays = new Set(meals.map(m => new Date(m.recorded_at).toDateString())).size;
  const streak = calcStreak(meals.map(m => m.recorded_at));
  const { score, level, levelDesc } = calcHealthScore(meals.length, uniqueDays);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <h1 className="text-xl font-bold">我的</h1>
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

      {/* Health stats */}
      <section className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">健康资产</h3>
        <div className="bg-card rounded-2xl p-5 shadow-card mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">健康分</span>
            </div>
            <span className="text-2xl font-bold text-primary">{score}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            等级：{level} · {levelDesc}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{streak}</p>
            <p className="text-[10px] text-muted-foreground">连续记录</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{uniqueDays}</p>
            <p className="text-[10px] text-muted-foreground">记录天数</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card text-center">
            <Utensils className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{meals.length}</p>
            <p className="text-[10px] text-muted-foreground">总餐数</p>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="px-5 mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">偏好设置</h3>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {[
            { label: "过敏原管理", info: profile.allergies || "未设置" },
            { label: "提醒设置", info: "" },
            { label: "隐私", info: "" },
          ].map(item => (
            <button key={item.label} className="w-full flex items-center justify-between px-4 py-3.5 text-sm">
              <span>{item.label}</span>
              <div className="flex items-center gap-1">
                {item.info && <span className="text-xs text-muted-foreground">{item.info}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pb-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">其他</h3>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {["帮助与反馈", "关于我们"].map(item => (
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
