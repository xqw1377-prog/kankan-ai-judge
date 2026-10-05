import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;

    const payload = await req.json();
    const { food_name, meal_type, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, sequence_score } = payload;

    if (!food_name) {
      return json(400, { error: "缺少食物名称" }, corsHeaders);
    }

    // Write as the signed-in user. RLS rejects any other user_id.
    // Do not use the service role here: it would bypass RLS for anonymous callers.
    const { data, error } = await auth.supabase.from("meal_records").insert({
      user_id: auth.userId,
      food_name,
      meal_type,
      calories: calories || 0,
      protein_g: protein_g || 0,
      fat_g: fat_g || 0,
      carbs_g: carbs_g || 0,
      ingredients: ingredients || [],
      verdict,
      suggestion,
      sequence_score: sequence_score ?? null,
    }).select().single();

    if (error) throw error;

    return json(200, { success: true, id: data?.id }, corsHeaders);
  } catch (e) {
    console.error("audit-confirm error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
