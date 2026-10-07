import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser, serviceDb } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Deletes the caller only. requireUser verifies the JWT with auth.getUser
// before any service-role client exists. Delete the auth user first.
// FK ON DELETE CASCADE removes user_profiles (including avatar_url),
// meal_records, meal_analyses, ai_usage, meal_feedbacks, habit_patterns,
// and guest_claim_tokens. There is no storage bucket for food photos.
// Owned-row cleanup runs only after deleteUser succeeds.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const db = serviceDb();
    if (!db) return json(500, { error: "服务未配置" }, corsHeaders);

    const { error: deleteError } = await db.auth.admin.deleteUser(auth.userId);
    if (deleteError) return json(500, { error: "没能删除登录身份" }, corsHeaders);

    const { error: purgeError } = await db.rpc("purge_user_owned_rows", { p_user_id: auth.userId });
    if (purgeError) console.error("purge after deleteUser:", purgeError);

    return json(200, { deleted: true }, corsHeaders);
  } catch (e) {
    console.error("delete-account error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
