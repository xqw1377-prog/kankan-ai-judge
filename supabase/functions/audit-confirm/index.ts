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
    if (action === "replace" && !payload.meal_id) return json(400, { error: "缺少餐食" }, corsHeaders);

    const mealType = MEAL_TYPES.has(payload.meal_type) ? payload.meal_type : "snack";
    const { data, error } = await db.rpc("consume_analysis_into_meal", {
      p_user_id: auth.userId,
      p_analysis_id: payload.analysis_id,
      p_meal_type: mealType,
      p_replace_meal_id: action === "replace" ? payload.meal_id : null,
    });
    if (error) throw error;
    const row = data as { status?: string; meal?: Record<string, unknown> } | null;
    if (row?.status === "already_consumed") return json(409, { error: "这餐已经记过了" }, corsHeaders);
    if (row?.status === "missing" || row?.status === "missing_meal" || !row?.meal) {
      return json(404, { error: "分析结果不存在" }, corsHeaders);
    }
    return json(200, { success: true, meal: row.meal }, corsHeaders);
  } catch (e) {
    console.error("audit-confirm error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
