import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

// Map health conditions to trigger ingredient keywords
const CONDITION_TRIGGERS: Record<string, { keywords: string[]; warning: string }> = {
  high_uric_acid: {
    keywords: ["海鲜", "shrimp", "seafood", "prawn", "lobster", "crab", "mussel", "oyster", "squid", "鱼", "虾", "蟹", "贝", "鱿鱼", "龙虾", "生蚝", "牡蛎", "啤酒", "beer", "内脏", "organ"],
    warning: "⚠️ 尿酸偏高 — 检测到高嘌呤食材，可能加重痛风风险",
  },
  high_blood_sugar: {
    keywords: ["白米", "white rice", "sugar", "糖", "蛋糕", "cake", "candy", "甜点", "dessert", "面包", "bread", "馒头", "粥", "congee", "juice", "果汁", "蜂蜜", "honey"],
    warning: "⚠️ 血糖偏高 — 检测到高升糖食材，建议严格控制摄入量",
  },
  high_cholesterol: {
    keywords: ["蛋黄", "egg yolk", "内脏", "organ", "butter", "黄油", "肥肉", "fatty", "lard", "猪油", "奶油", "cream"],
    warning: "⚠️ 胆固醇偏高 — 检测到高胆固醇食材，建议减少摄入",
  },
  high_blood_pressure: {
    keywords: ["腌", "pickled", "酱油", "soy sauce", "咸", "salt", "salted", "腊肉", "cured", "火腿", "ham", "咸鱼"],
    warning: "⚠️ 血压偏高 — 检测到高钠食材，可能影响血压控制",
  },
};

interface HealthAlertBannerProps {
  healthConditions: string[];
  ingredientNames: string[];
  visible: boolean;
}

const HealthAlertBanner = ({ healthConditions, ingredientNames, visible }: HealthAlertBannerProps) => {
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (!visible || healthConditions.length === 0 || ingredientNames.length === 0) {
      setAlerts([]);
      return;
    }

    const triggered: string[] = [];
    const lowerNames = ingredientNames.map((n) => n.toLowerCase());

    for (const condition of healthConditions) {
      const config = CONDITION_TRIGGERS[condition];
      if (!config) continue;
      const matched = config.keywords.some((kw) =>
        lowerNames.some((name) => name.includes(kw.toLowerCase()))
      );
      if (matched) triggered.push(config.warning);
    }

    setAlerts(triggered);
  }, [healthConditions, ingredientNames, visible]);

  if (alerts.length === 0) return null;

  return (
    <div className="shrink-0 px-4 pb-2 animate-fade-in">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border-2 border-destructive/60 bg-destructive/10 animate-health-alert"
        >
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-destructive leading-relaxed">{alert}</span>
        </div>
      ))}
    </div>
  );
};

export default HealthAlertBanner;
