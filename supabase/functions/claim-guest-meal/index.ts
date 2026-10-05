import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, requireUser, serviceDb } from "../_shared/guard.ts";

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
    if (body.action === "issue") {
      if (!auth.isAnonymous) return json(400, { error: "只有试用会话可以发起认领" }, corsHeaders);
      const { data, error } = await db.rpc("issue_guest_claim_token", { p_anonymous_user_id: auth.userId });
      if (error || !data) return json(500, { error: "没能发起认领" }, corsHeaders);
      return json(200, { token: data }, corsHeaders);
    }

    if (body.action === "claim") {
      if (auth.isAnonymous) return json(403, { error: "请先登录已有账号" }, corsHeaders);
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) return json(400, { error: "缺少认领凭证" }, corsHeaders);
      const { data, error } = await db.rpc("claim_guest_meals", { p_owner_id: auth.userId, p_token: token });
      if (error) return json(500, { error: "没能认领试用记录" }, corsHeaders);
      const status = data && typeof data === "object" ? (data as { status?: string }).status : "";
      if (status !== "claimed") return json(403, { error: "认领凭证无效" }, corsHeaders);
      return json(200, data as Record<string, unknown>, corsHeaders);
    }

    return json(400, { error: "未知操作" }, corsHeaders);
  } catch (e) {
    console.error("claim-guest-meal error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" }, corsHeaders);
  }
});
