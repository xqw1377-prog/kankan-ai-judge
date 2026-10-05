const PROFILE_KEYS = [
  "gender",
  "age",
  "height_cm",
  "weight_kg",
  "activity_level",
  "goal",
  "diet_preference",
  "cooking_source",
  "allergies",
  "nickname",
  "avatar_url",
  "onboarding_completed",
] as const;

/** Body sent to save-profile. Ownership and targets stay on the server. */
export function profileSaveBody(input: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const key of PROFILE_KEYS) {
    if (input[key] !== undefined) body[key] = input[key];
  }
  return body;
}

/** Body sent to audit-confirm. Nutrition is copied from the stored analysis. */
export function mealConfirmBody(analysisId: string, mealType: string) {
  return { analysis_id: analysisId, meal_type: mealType };
}

export function mealDeleteBody(mealId: string) {
  return { action: "delete" as const, meal_id: mealId };
}

export function mealReplaceBody(mealId: string, analysisId: string) {
  return { action: "replace" as const, meal_id: mealId, analysis_id: analysisId };
}

export function localDayWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
