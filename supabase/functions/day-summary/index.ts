import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser } from "../_shared/guard.ts";
import { scoreFromSaved } from "../_shared/nutrition.ts";

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

    const body = await req.json().catch(() => ({}));
    const start = new Date(body.start);
    const end = new Date(body.end);
    const windowMs = end.getTime() - start.getTime();
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || windowMs <= 0 || windowMs > 36 * 60 * 60 * 1000) {
      return json(400, { error: "日期范围不正确" }, corsHeaders);
    }

    const { data: meals, error } = await auth.supabase
      .from("meal_records")
      .select("calories, protein_g, fat_g, carbs_g, recorded_at")
      .eq("user_id", auth.userId)
      .gte("recorded_at", start.toISOString())
      .lt("recorded_at", end.toISOString());
    if (error) throw error;

    const totals = (meals ?? []).reduce((sum, meal) => ({
      calories: sum.calories + (Number(meal.calories) || 0),
      protein_g: sum.protein_g + (Number(meal.protein_g) || 0),
      fat_g: sum.fat_g + (Number(meal.fat_g) || 0),
      carbs_g: sum.carbs_g + (Number(meal.carbs_g) || 0),
    }), { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 });

    const { data: profile, error: profileError } = await auth.supabase
      .from("user_profiles")
      .select("target_calories, target_protein_g, target_fat_g, target_carbs_g")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const targets = profile?.target_calories
      ? {
        calories: Number(profile.target_calories),
        protein_g: Number(profile.target_protein_g) || 0,
        fat_g: Number(profile.target_fat_g) || 0,
        carbs_g: Number(profile.target_carbs_g) || 0,
      }
      : null;

    const score = targets ? scoreFromSaved(totals, targets) : null;
    return json(200, { score, totals, targets, meals: meals?.length ?? 0 }, corsHeaders);
  } catch (e) {
    console.error("day-summary error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
