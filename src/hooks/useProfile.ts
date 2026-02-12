import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import { calculateNutrition, type UserProfile, type NutritionTargets } from "@/lib/nutrition";

export interface FullProfile extends UserProfile {
  id?: string;
  device_id: string;
  onboarding_completed: boolean;
  targets: NutritionTargets;
}

export function useProfile() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchProfile = useCallback(async () => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (data) {
      const profileData: UserProfile = {
        gender: data.gender as any || "male",
        age: data.age || 28,
        height_cm: data.height_cm || 170,
        weight_kg: data.weight_kg || 65,
        activity_level: (data.activity_level as any) || "light",
        goal: (data.goal as any) || "maintain",
      };
      const targets = calculateNutrition(profileData);
      setProfile({
        ...data,
        ...profileData,
        targets,
        onboarding_completed: data.onboarding_completed ?? false,
      } as FullProfile);
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (updates: Partial<UserProfile> & { onboarding_completed?: boolean }) => {
    const targets = calculateNutrition({ ...profile, ...updates } as UserProfile);
    const payload = {
      ...updates,
      device_id: deviceId,
      tdee: targets.tdee,
      target_calories: targets.calories,
      target_protein_g: targets.protein_g,
      target_fat_g: targets.fat_g,
      target_carbs_g: targets.carbs_g,
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "device_id" })
      .select()
      .single();

    if (!error && data) {
      setProfile({
        ...data,
        targets,
        onboarding_completed: data.onboarding_completed ?? false,
      } as FullProfile);
    }
    return { data, error };
  }, [deviceId, profile]);

  return { profile, loading, saveProfile, refetch: fetchProfile };
}
