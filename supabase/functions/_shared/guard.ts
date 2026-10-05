import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasUserBearer } from "./bearer.ts";

export const AI_CALLS_PER_HOUR = 20;

export function json(status: number, body: Record<string, unknown>, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request, cors: Record<string, string>): Promise<
  | { userId: string; supabase: SupabaseClient }
  | Response
> {
  const header = req.headers.get("Authorization");
  if (!hasUserBearer(header)) return json(401, { error: "需要登录" }, cors);
  const match = (header ?? "").match(/^Bearer\s+(\S+)$/i);
  if (!match) return json(401, { error: "需要登录" }, cors);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anon) return json(500, { error: "服务未配置" }, cors);

  const token = match[1];
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json(401, { error: "需要登录" }, cors);
  return { userId: data.user.id, supabase };
}

/**
 * Service role bypasses RLS. Call it only after requireUser succeeds.
 * Anonymous requests never reach this.
 */
export function serviceDb(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Counts this user's recent AI calls. Uses the user JWT, not the service role. */
export async function enforceAiRateLimit(
  supabase: SupabaseClient,
  userId: string,
  cors: Record<string, string>,
): Promise<Response | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return json(503, { error: "暂时无法校验调用次数" }, cors);
  if ((count ?? 0) >= AI_CALLS_PER_HOUR) {
    return json(429, { error: "请求太频繁，请一小时后再试" }, cors);
  }
  const { error: insertError } = await supabase.from("ai_usage").insert({ user_id: userId });
  if (insertError) return json(503, { error: "暂时无法校验调用次数" }, cors);
  return null;
}
