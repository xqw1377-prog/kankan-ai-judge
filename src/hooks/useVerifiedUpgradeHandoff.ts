import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUser";
import { adoptVerifiedUpgrade } from "@/lib/guestHandoff";
import { profileSaveBody } from "@/lib/serverWrites";

/** When the same anonymous user becomes permanent, adopt the local profile once. */
export function useVerifiedUpgradeHandoff() {
  const { ready, userId, isAnonymous } = useAuthUserId();

  useEffect(() => {
    if (!ready) return;
    const adopted = adoptVerifiedUpgrade({ userId, isAnonymous });
    if (adopted.status !== "adopted" || adopted.already || !adopted.profile) return;
    void supabase.functions.invoke("save-profile", {
      body: profileSaveBody({ ...adopted.profile } as Record<string, unknown>),
    });
  }, [ready, userId, isAnonymous]);
}
