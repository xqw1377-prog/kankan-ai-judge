import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  GUEST_FREE_LIMIT,
  GUEST_SUCCESS_KIND,
  guestQuotaDecision,
} from "./guestQuotaDecision.ts";
import { json } from "./guard.ts";

export const GUEST_LIMIT_BODY = {
  error: "每台设备的一次试用已用完，注册后继续记录",
  code: GUEST_FREE_LIMIT,
};

/** Other model calls are not part of the one free food recognition. */
export function denyAnonymousAi(isAnonymous: boolean, cors: Record<string, string>): Response | null {
  if (!isAnonymous) return null;
  return json(403, { error: "注册后可继续使用云端分析", code: "REGISTER_REQUIRED" }, cors);
}

export async function guestSuccessCount(supabase: SupabaseClient, userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", GUEST_SUCCESS_KIND);
  if (error) return null;
  return count ?? 0;
}

/** Blocks an anonymous user who already has a successful food analysis. Does not record the attempt. */
export async function enforceGuestFoodQuota(
  supabase: SupabaseClient,
  userId: string,
  isAnonymous: boolean,
  cors: Record<string, string>,
): Promise<Response | null> {
  if (!isAnonymous) return null;
  const successfulCount = await guestSuccessCount(supabase, userId);
  if (successfulCount == null) return json(503, { error: "暂时无法校验调用次数" }, cors);
  const decision = guestQuotaDecision({ isAnonymous: true, successfulCount });
  if (!decision.allow) return json(decision.status, GUEST_LIMIT_BODY, cors);
  return null;
}

/** Call only after a successful analysis was stored. One row per anonymous trial, not per person for life. */
export async function recordGuestFoodSuccess(
  supabase: SupabaseClient,
  userId: string,
  isAnonymous: boolean,
  cors: Record<string, string>,
): Promise<Response | null> {
  if (!isAnonymous) return null;
  const { error } = await supabase.from("ai_usage").insert({
    user_id: userId,
    kind: GUEST_SUCCESS_KIND,
  });
  if (!error) return null;
  if (duplicateGuestSlot(error)) return json(403, GUEST_LIMIT_BODY, cors);
  return json(503, { error: "暂时无法校验调用次数" }, cors);
}

function asReplay(row: Record<string, unknown>) {
  return {
    food: String(row.food_name ?? ""),
    calories: Number(row.calories) || 0,
    protein_g: Number(row.protein_g) || 0,
    fat_g: Number(row.fat_g) || 0,
    carbs_g: Number(row.carbs_g) || 0,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    verdict: String(row.verdict ?? ""),
    suggestion: String(row.suggestion ?? ""),
    analysis_id: String(row.id),
    recovered: true,
  };
}

function duplicateGuestSlot(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|ai_usage_one_guest_success/i.test(error.message ?? "");
}

/** Insert the one guest_success row before the model call. The unique index makes this atomic. */
export async function reserveGuestFoodSlot(
  supabase: SupabaseClient,
  userId: string,
): Promise<"reserved" | "taken" | "error"> {
  const { error } = await supabase.from("ai_usage").insert({
    user_id: userId,
    kind: GUEST_SUCCESS_KIND,
  });
  if (!error) return "reserved";
  if (duplicateGuestSlot(error)) return "taken";
  return "error";
}

/** Drop the reservation when the model call or storage fails, so the trial can be retried. */
export async function releaseGuestFoodSlot(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from("ai_usage").delete().eq("user_id", userId).eq("kind", GUEST_SUCCESS_KIND);
}

/** Exact idempotency-key match only. A different photo does not replay an older analysis. */
export async function replayGuestAnalysis(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
): Promise<Record<string, unknown> | null> {
  if (!idempotencyKey) return null;
  const { data } = await supabase
    .from("meal_analyses")
    .select("id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!data?.id) return null;
  return asReplay(data as Record<string, unknown>);
}
