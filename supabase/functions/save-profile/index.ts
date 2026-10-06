import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser, serviceDb } from "../_shared/guard.ts";
import { targetsFromBody } from "../_shared/nutrition.ts";
import { ALLERGIES_MAX, AVATAR_MAX_BYTES, NICKNAME_MAX, profileFieldError } from "../_shared/profileFields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const db = serviceDb();
    if (!db) return json(500, { error: "服务未配置" }, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const fieldCode = profileFieldError({
      nickname: body && typeof body === "object" && "nickname" in body ? body.nickname : undefined,
      allergies: body && typeof body === "object" && "allergies" in body ? body.allergies : undefined,
      avatar_url: body && typeof body === "object" && "avatar_url" in body ? body.avatar_url : undefined,
    });
    if (fieldCode) {
      const message = fieldCode === "nickname_too_long"
        ? `昵称不能超过${NICKNAME_MAX}个字`
        : fieldCode === "allergies_too_long"
          ? `过敏信息不能超过${ALLERGIES_MAX}个字`
          : `头像需要是${Math.round(AVATAR_MAX_BYTES / 1024)}KB以内的JPEG、PNG或WebP`;
      return json(400, { error: message, code: fieldCode }, corsHeaders);
    }
    const { data: existing, error: readError } = await db
      .from("user_profiles")
      .select("*")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (readError) throw readError;

    const merged = {
      gender: body.gender ?? existing?.gender ?? null,
      age: body.age ?? existing?.age ?? null,
      height_cm: body.height_cm ?? existing?.height_cm ?? null,
      weight_kg: body.weight_kg ?? existing?.weight_kg ?? null,
      activity_level: body.activity_level ?? existing?.activity_level ?? null,
      goal: body.goal ?? existing?.goal ?? null,
      diet_preference: body.diet_preference ?? existing?.diet_preference ?? null,
      cooking_source: body.cooking_source ?? existing?.cooking_source ?? null,
      allergies: body.allergies ?? existing?.allergies ?? null,
      nickname: body.nickname ?? existing?.nickname ?? null,
      avatar_url: body.avatar_url ?? existing?.avatar_url ?? null,
      onboarding_completed: body.onboarding_completed ?? existing?.onboarding_completed ?? false,
    };

    const bodyFields = ["gender", "age", "height_cm", "weight_kg", "activity_level", "goal"] as const;
    const sentBody = bodyFields.some((key) => body[key] != null);
    let targets = {
      tdee: existing?.tdee ?? null,
      calories: existing?.target_calories ?? null,
      protein_g: existing?.target_protein_g ?? null,
      fat_g: existing?.target_fat_g ?? null,
      carbs_g: existing?.target_carbs_g ?? null,
    };
    if (sentBody) {
      const computed = targetsFromBody(merged);
      if (!computed) return json(400, { error: "身体数据不完整" }, corsHeaders);
      targets = computed;
    }

    const payload = {
      user_id: auth.userId,
      ...merged,
      tdee: targets.tdee,
      target_calories: targets.calories,
      target_protein_g: targets.protein_g,
      target_fat_g: targets.fat_g,
      target_carbs_g: targets.carbs_g,
    };

    const write = existing
      ? db.from("user_profiles").update(payload).eq("user_id", auth.userId).select().single()
      : db.from("user_profiles").insert(payload).select().single();
    const { data, error } = await write;
    if (error) throw error;
    return json(200, { profile: data }, corsHeaders);
  } catch (e) {
    console.error("save-profile error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
