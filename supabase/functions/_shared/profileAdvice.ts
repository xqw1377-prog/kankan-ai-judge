/** Server-side notes after the model returns. Never put these fields in gateway messages. */

export interface AdviceProfile {
  goal?: string | null;
  allergies?: string | null;
  diet_preference?: string | null;
}

const GOAL_ZH: Record<string, string> = {
  fat_loss: "按减重目标，这一餐可以少油、先吃菜。",
  muscle_gain: "按增肌目标，这一餐可以再配一份蛋白质。",
  sugar_control: "按控糖目标，主食可以换粗粮。",
  maintain: "按维持目标，按这个份量吃就好。",
};

const GOAL_EN: Record<string, string> = {
  fat_loss: "For a fat-loss goal, keep this meal lighter and eat the vegetables first.",
  muscle_gain: "For a muscle-gain goal, this meal can use another protein source.",
  sugar_control: "For a blood-sugar goal, swap the starch for a whole grain.",
  maintain: "For a maintain goal, this portion is a reasonable plate.",
};

export function avoidanceNote(
  allergies: string | null | undefined,
  names: string[],
  language: "zh-CN" | "en-US",
): string | null {
  const tokens = (allergies ?? "").split(/[,，、\s]+/).map((part) => part.trim()).filter(Boolean);
  const hits = names.filter((name) => tokens.some((token) => name.includes(token)));
  if (!hits.length) return null;
  return language === "en-US"
    ? `Avoidance note: recognized ingredient names include ${hits.join(", ")}. This is a name match only, not a medical allergen test, and not a safety clearance.`
    : `忌口提醒：识别到的食材名称包含${hits.join("、")}。只按名称匹配，不是医学过敏原检测，也不能当作能不能吃的结论。`;
}

export function applyProfileAdvice<T extends { ingredients?: Array<{ name?: string }>; suggestion?: string }>(
  analysis: T,
  profile: AdviceProfile,
  language: "zh-CN" | "en-US",
): T {
  const names = (analysis.ingredients ?? []).map((item) => item.name ?? "").filter(Boolean);
  const extra: string[] = [];
  const goal = profile.goal ?? "";
  const goalLine = language === "en-US" ? GOAL_EN[goal] : GOAL_ZH[goal];
  if (goalLine) extra.push(goalLine);
  if (profile.diet_preference) {
    extra.push(language === "en-US"
      ? `Diet preference on file: ${profile.diet_preference}.`
      : `已记录的饮食偏好：${profile.diet_preference}。`);
  }
  const avoid = avoidanceNote(profile.allergies, names, language);
  if (avoid) extra.push(avoid);
  if (!extra.length) return analysis;
  const suggestion = [analysis.suggestion, ...extra].filter(Boolean).join(" ").slice(0, 800);
  return { ...analysis, suggestion };
}
