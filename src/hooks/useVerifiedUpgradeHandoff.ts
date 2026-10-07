import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUser";
import { commitVerifiedUpgrade, upgradeProfileSaved } from "@/lib/guestHandoff";
import { profileSaveBody } from "@/lib/serverWrites";

/** COPY → save-profile success → mark adopted → clear the guest source. Retries while pending_sync. */
export function useVerifiedUpgradeHandoff() {
  const { ready, userId, isAnonymous } = useAuthUserId();

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void commitVerifiedUpgrade({ userId, isAnonymous }, async (profile) => {
      const { data, error } = await supabase.functions.invoke("save-profile", {
        body: profileSaveBody({ ...profile } as Record<string, unknown>),
      });
      if (cancelled) return false;
      return upgradeProfileSaved(data, error);
    });
    return () => { cancelled = true; };
  }, [ready, userId, isAnonymous]);
}
