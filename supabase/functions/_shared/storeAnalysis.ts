import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAnalysis } from "./analysisContract.ts";
import { serviceDb } from "./guard.ts";

export interface AnalysisDraft {
  food: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  ingredients?: unknown;
  verdict?: string;
  suggestion?: string;
}

export interface AnalysisMeta {
  provider: string;
  model: string;
  uncertainty: string;
}

export interface StoredAnalysis {
  id: string;
  reused: boolean;
}

/** Persists a validated model result. The client does not choose the numbers. */
export async function storeAnalysis(
  userId: string,
  draft: AnalysisDraft,
  meta: AnalysisMeta,
  idempotencyKey?: string | null,
): Promise<StoredAnalysis | null> {
  const checked = validateAnalysis(draft);
  if (!checked.ok) return null;
  const db = serviceDb();
  if (!db) return null;
  const key = idempotencyKey?.trim() || null;
  const { data, error } = await db.from("meal_analyses").insert({
    user_id: userId,
    food_name: checked.value.food,
    calories: checked.value.calories,
    protein_g: checked.value.protein_g,
    fat_g: checked.value.fat_g,
    carbs_g: checked.value.carbs_g,
    ingredients: checked.value.ingredients,
    verdict: checked.value.verdict,
    suggestion: checked.value.suggestion,
    provider: meta.provider,
    model: meta.model,
    validation_status: "passed",
    uncertainty: meta.uncertainty,
    idempotency_key: key,
  }).select("id").single();
  if (!error && data?.id) return { id: String(data.id), reused: false };
  const duplicate = error?.code === "23505" || /duplicate key|meal_analyses_user_idempotency/i.test(error?.message ?? "");
  if (!duplicate || !key) return null;
  const { data: existing } = await db.from("meal_analyses").select("id")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (!existing?.id) return null;
  return { id: String(existing.id), reused: true };
}

export type GuestLeaseStoreResult =
  | { ok: true; id: string; reused: boolean }
  | { ok: false; reason: "stale_lease" | "error" };

function storePayload(data: unknown): { status?: unknown; id?: unknown; reused?: unknown } | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as { status?: unknown; id?: unknown; reused?: unknown };
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  return data as { status?: unknown; id?: unknown; reused?: unknown };
}

/** Store the guest analysis and complete that same lease, or store nothing. */
export async function storeGuestAnalysisWithLease(
  db: SupabaseClient,
  userId: string,
  leaseId: string,
  draft: AnalysisDraft,
  meta: AnalysisMeta,
  idempotencyKey?: string | null,
): Promise<GuestLeaseStoreResult> {
  const checked = validateAnalysis(draft);
  if (!checked.ok || !leaseId) return { ok: false, reason: "error" };
  const { data, error } = await db.rpc("store_guest_analysis_with_lease", {
    p_user_id: userId,
    p_lease_id: leaseId,
    p_food_name: checked.value.food,
    p_calories: checked.value.calories,
    p_protein_g: checked.value.protein_g,
    p_fat_g: checked.value.fat_g,
    p_carbs_g: checked.value.carbs_g,
    p_ingredients: checked.value.ingredients,
    p_verdict: checked.value.verdict,
    p_suggestion: checked.value.suggestion,
    p_provider: meta.provider,
    p_model: meta.model,
    p_uncertainty: meta.uncertainty,
    p_idempotency_key: idempotencyKey?.trim() || null,
  });
  const row = error ? null : storePayload(data);
  if (!row) return { ok: false, reason: "error" };
  if (row.status === "stale_lease") return { ok: false, reason: "stale_lease" };
  if (row.status === "stored" && typeof row.id === "string" && row.id) {
    return { ok: true, id: row.id, reused: row.reused === true };
  }
  return { ok: false, reason: "error" };
}
