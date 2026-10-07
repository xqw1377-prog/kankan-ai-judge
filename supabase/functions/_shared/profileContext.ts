import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AdviceProfile } from "./profileAdvice.ts";

/**
 * Goal, allergies, and diet preference only.
 * Applied after the model returns. Never interpolated into gateway messages.
 */
export async function loadAdviceProfile(supabase: SupabaseClient, userId: string): Promise<AdviceProfile> {
  const { data } = await supabase
    .from("user_profiles")
    .select("goal, allergies, diet_preference")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return {};
  return {
    goal: typeof data.goal === "string" ? data.goal : null,
    allergies: typeof data.allergies === "string" ? data.allergies : null,
    diet_preference: typeof data.diet_preference === "string" ? data.diet_preference : null,
  };
}
