import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser, serviceDb } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const db = serviceDb();
    if (!db) return json(500, { error: "服务未配置" }, corsHeaders);

    const payload = await req.json().catch(() => ({}));
    const action = payload.action ?? "save";

    if (action === "delete") {
      if (!payload.meal_id) return json(400, { error: "缺少餐食" }, corsHeaders);
      const { error } = await db.from("meal_records").delete().eq("id", payload.meal_id).eq("user_id", auth.userId);
      if (error) throw error;
      return json(200, { success: true }, corsHeaders);
    }

    if (!payload.analysis_id) return json(400, { error: "缺少分析结果" }, corsHeaders);
    const { data: analysis, error: readError } = await db
      .from("meal_analyses")
      .select("*")
      .eq("id", payload.analysis_id)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (readError) throw readError;
    if (!analysis) return json(404, { error: "分析结果不存在" }, corsHeaders);

    if (action === "replace") {
      if (!payload.meal_id) return json(400, { error: "缺少餐食" }, corsHeaders);
      const { data, error } = await db.from("meal_records").update({
        food_name: analysis.food_name,
        calories: analysis.calories,
        protein_g: analysis.protein_g,
        fat_g: analysis.fat_g,
        carbs_g: analysis.carbs_g,
        ingredients: analysis.ingredients,
        verdict: analysis.verdict,
        suggestion: analysis.suggestion,
      }).eq("id", payload.meal_id).eq("user_id", auth.userId).select().single();
      if (error) throw error;
      await db.from("meal_analyses").update({ consumed_at: new Date().toISOString() }).eq("id", analysis.id).eq("user_id", auth.userId);
      return json(200, { success: true, meal: data }, corsHeaders);
    }

    const mealType = MEAL_TYPES.has(payload.meal_type) ? payload.meal_type : "snack";
    const { data, error } = await db.from("meal_records").insert({
      user_id: auth.userId,
      food_name: analysis.food_name,
      meal_type: mealType,
      calories: analysis.calories,
      protein_g: analysis.protein_g,
      fat_g: analysis.fat_g,
      carbs_g: analysis.carbs_g,
      ingredients: analysis.ingredients,
      verdict: analysis.verdict,
      suggestion: analysis.suggestion,
    }).select().single();
    if (error) throw error;
    await db.from("meal_analyses").update({ consumed_at: new Date().toISOString() }).eq("id", analysis.id).eq("user_id", auth.userId);
    return json(200, { success: true, meal: data }, corsHeaders);
  } catch (e) {
    console.error("audit-confirm error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
