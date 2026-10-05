import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Reads the signed-in profile. Client-supplied body facts are not used. */
export async function serverProfileNote(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("user_profiles")
    .select("goal, allergies, diet_preference, activity_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "";
  const parts: string[] = [];
  if (typeof data.goal === "string" && data.goal) parts.push(`目标：${data.goal}`);
  if (typeof data.allergies === "string" && data.allergies) parts.push(`过敏/忌口：${data.allergies}`);
  if (typeof data.diet_preference === "string" && data.diet_preference) parts.push(`饮食偏好：${data.diet_preference}`);
  if (typeof data.activity_level === "string" && data.activity_level) parts.push(`活动量：${data.activity_level}`);
  return parts.join("。");
}
