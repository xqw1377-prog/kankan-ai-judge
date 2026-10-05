import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateNutrition, type UserProfile } from "@/lib/nutrition";
import {
  GUEST_SCOPE,
  hydrateProfile,
  readProfile,
  writeProfile,
  type StoredProfile,
} from "@/lib/localData";
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
    setProfile(readProfile(scope));
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const full = hydrateProfile(data as StoredProfile) as FullProfile;
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
    const merged = hydrateProfile({
      ...profile,
      ...updates,
      device_id: profile?.device_id || "",
      onboarding_completed: updates.onboarding_completed ?? profile?.onboarding_completed ?? true,
      details_skipped: updates.details_skipped ?? false,
    });
    const targets = calculateNutrition(merged);
    const next: FullProfile = { ...profile, ...merged, targets };
    writeProfile(scope, next);
    setProfile(next);

    if (!userId) return { data: next, error: null };

    try {
      const payload = {
        user_id: userId,
        gender: next.gender,
        age: next.age,
        height_cm: next.height_cm,
        weight_kg: next.weight_kg,
        activity_level: next.activity_level,
        goal: next.goal,
        diet_preference: next.diet_preference,
        cooking_source: next.cooking_source,
        allergies: next.allergies,
        nickname: next.nickname,
        avatar_url: next.avatar_url,
        onboarding_completed: next.onboarding_completed,
        tdee: targets.tdee,
        target_calories: targets.calories,
        target_protein_g: targets.protein_g,
        target_fat_g: targets.fat_g,
        target_carbs_g: targets.carbs_g,
      };
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (!error && data) {
        const remote = hydrateProfile({ ...next, ...data }) as FullProfile;
        remote.details_skipped = next.details_skipped;
        writeProfile(scope, remote);
        setProfile(remote);
      }
    } catch {
      // The profile is already on this device. Server sync can retry later.
    }
    return { data: next, error: null };
  }, [profile, scope, userId]);

  return { profile, loading, saveProfile, userId };
}
