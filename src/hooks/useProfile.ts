import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type UserProfile } from "@/lib/nutrition";
import {
  GUEST_SCOPE,
  hydrateProfile,
  profileFromServer,
  readProfile,
  writeProfile,
  type StoredProfile,
} from "@/lib/localData";
import { profileSaveBody } from "@/lib/serverWrites";
import { profileFieldError } from "@/lib/profileFields";
import { readInvokeFailure } from "@/lib/invokeFailure";
import { allowRemoteLocalWrite, localWriteGeneration } from "@/lib/mealWriteGuard";
import { useAuthUserId } from "@/hooks/useAuthUser";

export interface FullProfile extends StoredProfile {
  id?: string;
}

/** A failed fetch keeps the cached profile, including one whose targets are still null. */
export function resolveProfileLoad(
  cached: FullProfile | null,
  outcome: { failed: boolean; row: Record<string, unknown> | null },
): { profile: FullProfile | null; ready: boolean } {
  if (outcome.failed) {
    if (cached) return { profile: cached, ready: true };
    return { profile: null, ready: false };
  }
  if (!outcome.row) return { profile: cached, ready: true };
  const full = profileFromServer(outcome.row) as FullProfile;
  full.id = typeof outcome.row.id === "string" ? outcome.row.id : undefined;
  return { profile: full, ready: true };
}

export function useProfile() {
  const { ready, userId: sessionUserId, isAnonymous } = useAuthUserId();
  // Anonymous sessions exist only so one food scan can call the API. Profile stays on this device.
  const userId = sessionUserId && !isAnonymous ? sessionUserId : null;
  const scope = userId ?? GUEST_SCOPE;
  const [profile, setProfile] = useState<FullProfile | null>(null);
  // Auth ready is not profile resolved: stay loading until this scope has been read.
  const [resolvedScope, setResolvedScope] = useState<string | null>(null);
  const authReady = ready;
  const profileReady = authReady && resolvedScope === scope;
  const loading = !authReady || !profileReady;

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setProfile(readProfile(scope));
      setResolvedScope(scope);
      return;
    }
    const cached = readProfile(scope);
    setProfile(cached);
    const gen = localWriteGeneration(scope);
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        let request = supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId);
        const abortable = request as typeof request & { abortSignal?: (value: AbortSignal) => typeof request };
        if (abortable.abortSignal) request = abortable.abortSignal(controller.signal);
        const { data, error } = await request.maybeSingle();
        if (cancelled || controller.signal.aborted) return;
        if (!allowRemoteLocalWrite(scope, gen)) return;
        const resolved = resolveProfileLoad(cached, {
          failed: Boolean(error),
          row: !error && data ? data as Record<string, unknown> : null,
        });
        if (!resolved.ready || !allowRemoteLocalWrite(scope, gen)) return;
        setResolvedScope(scope);
        setProfile(resolved.profile);
        if (resolved.profile && !error && data) writeProfile(scope, resolved.profile);
      } catch {
        if (!cancelled) setResolvedScope(scope);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ready, scope, userId]);

  const saveProfile = useCallback(async (
    updates: Partial<UserProfile> & {
      onboarding_completed?: boolean;
      details_skipped?: boolean;
      nickname?: string;
      avatar_url?: string;
    },
  ) => {
    const fieldCode = profileFieldError(updates);
    if (fieldCode) return { data: null, error: { message: fieldCode, code: fieldCode } };
    if (!userId) {
      const merged = hydrateProfile({
        ...profile,
        ...updates,
        device_id: profile?.device_id || "",
        onboarding_completed: updates.onboarding_completed ?? profile?.onboarding_completed ?? true,
        details_skipped: updates.details_skipped ?? false,
      });
      const next: FullProfile = { ...profile, ...merged };
      writeProfile(scope, next);
      setProfile(next);
      return { data: next, error: null };
    }

    try {
      const { data, error } = await supabase.functions.invoke("save-profile", {
        body: profileSaveBody({ ...updates } as Record<string, unknown>),
      });
      const row = data && typeof data === "object" ? (data as { profile?: Record<string, unknown>; error?: string }).profile : undefined;
      const failure = await readInvokeFailure(data, error);
      if (error || !row) return { data: null, error: { message: failure.message || "save failed", code: failure.code } };
      const remote = profileFromServer(row) as FullProfile;
      remote.details_skipped = updates.details_skipped ?? profile?.details_skipped ?? false;
      remote.id = typeof row.id === "string" ? row.id : undefined;
      writeProfile(scope, remote);
      setProfile(remote);
      return { data: remote, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, [profile, scope, userId]);

  return { profile, loading, authReady, profileReady, saveProfile, userId };
}
