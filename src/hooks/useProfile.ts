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
import { useAuthUserId } from "@/hooks/useAuthUser";

export interface FullProfile extends StoredProfile {
  id?: string;
}

export function useProfile() {
  const { ready, userId } = useAuthUserId();
  const scope = userId ?? GUEST_SCOPE;
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const loading = !ready;

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setProfile(readProfile(scope));
      return;
    }
    const cached = readProfile(scope);
    setProfile(cached?.targetsFromServer ? cached : null);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const full = profileFromServer(data as Record<string, unknown>) as FullProfile;
      full.id = typeof (data as { id?: string }).id === "string" ? (data as { id: string }).id : undefined;
      writeProfile(scope, full);
      setProfile(full);
    })();
    return () => { cancelled = true; };
  }, [ready, scope, userId]);

  const saveProfile = useCallback(async (
    updates: Partial<UserProfile> & {
      onboarding_completed?: boolean;
      details_skipped?: boolean;
      nickname?: string;
      avatar_url?: string;
    },
  ) => {
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
      const failed = error || (data && typeof data === "object" && (data as { error?: string }).error) || !row;
      if (failed || !row) return { data: null, error: error ?? { message: "save failed" } };
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

  return { profile, loading, saveProfile, userId };
}
