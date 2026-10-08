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

export const ADVICE_MAX_CHARS = 800;
export const AVOIDANCE_NAME_CAP = 5;

const DISCLAIMER_ZH = "只按名称匹配，不是医学过敏原检测，也不能当作能不能吃的结论。";
const DISCLAIMER_EN = "This is a name match only, not a medical allergen test, and not a safety clearance.";

function listedNames(hits: string[], language: "zh-CN" | "en-US"): string {
  const shown = hits.slice(0, AVOIDANCE_NAME_CAP);
  const more = hits.length > AVOIDANCE_NAME_CAP;
  if (language === "en-US") return more ? `${shown.join(", ")}, and others` : shown.join(", ");
  return more ? `${shown.join("、")}等` : shown.join("、");
}

export function avoidanceNote(
  allergies: string | null | undefined,
  names: string[],
  language: "zh-CN" | "en-US",
): string | null {
  const tokens = (allergies ?? "").split(/[,，、\s]+/).map((part) => part.trim()).filter(Boolean);
  const hits = names.filter((name) => tokens.some((token) => name.includes(token)));
  if (!hits.length) return null;
  const list = listedNames(hits, language);
  return language === "en-US"
    ? `Avoidance note: recognized ingredient names include ${list}. ${DISCLAIMER_EN}`
    : `忌口提醒：识别到的食材名称包含${list}。${DISCLAIMER_ZH}`;
}

function fitFront(pieces: string[], budget: number): string {
  const kept: string[] = [];
  let used = 0;
  for (const piece of pieces) {
    if (!piece || budget <= used) break;
    const sep = kept.length ? 1 : 0;
    const room = budget - used - sep;
    if (room <= 0) break;
    const cut = piece.slice(0, room);
    kept.push(cut);
    used += sep + cut.length;
    if (cut.length < piece.length) break;
  }
  return kept.join(" ");
}

export function applyProfileAdvice<T extends { ingredients?: Array<{ name?: string }>; suggestion?: string }>(
  analysis: T,
  profile: AdviceProfile,
  language: "zh-CN" | "en-US",
): T {
  const names = (analysis.ingredients ?? []).map((item) => item.name ?? "").filter(Boolean);
  const avoid = avoidanceNote(profile.allergies, names, language) ?? "";
  const goal = profile.goal ?? "";
  const goalLine = (language === "en-US" ? GOAL_EN[goal] : GOAL_ZH[goal]) ?? "";
  const diet = profile.diet_preference?.trim()
    ? (language === "en-US"
      ? `Diet preference on file: ${profile.diet_preference.trim()}.`
      : `已记录的饮食偏好：${profile.diet_preference.trim()}。`)
    : "";
  const model = (analysis.suggestion ?? "").trim();
  if (!avoid && !goalLine && !diet) return analysis;

  const tail = avoid;
  const frontBudget = Math.max(0, ADVICE_MAX_CHARS - tail.length - (tail ? 1 : 0));
  const notes = fitFront([goalLine, diet], frontBudget);
  const modelBudget = Math.max(0, frontBudget - notes.length - (notes && model ? 1 : 0));
  const front = [model.slice(0, modelBudget), notes].filter(Boolean).join(" ");
  const suggestion = [front, tail].filter(Boolean).join(" ");
  return { ...analysis, suggestion };
}
