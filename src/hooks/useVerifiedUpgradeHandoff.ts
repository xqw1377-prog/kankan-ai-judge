import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUser";
import {
  commitVerifiedUpgrade,
  readUpgradeHandoff,
  upgradeProfileSaved,
  type VerifiedUpgradeResult,
} from "@/lib/guestHandoff";
import type { StoredProfile } from "@/lib/localData";
import { profileSaveBody } from "@/lib/serverWrites";
import { nextAutomaticUpgradeDelay, upgradeSyncAttemptAllowed } from "@/lib/upgradeSyncRetry";

async function saveUpgradeProfile(profile: StoredProfile): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("save-profile", {
    body: profileSaveBody({ ...profile } as Record<string, unknown>),
  });
  return upgradeProfileSaved(data, error);
}

export function pendingUpgradeSyncFor(userId: string | null | undefined, isAnonymous: boolean): boolean {
  if (!userId || isAnonymous) return false;
  const marker = readUpgradeHandoff();
  return marker?.state === "pending_sync" && marker.anonymousUserId === userId;
}

/** Manual retry. Does not spend the automatic attempt budget. Guest source stays until the server confirms. */
export function syncVerifiedUpgradeNow(session: {
  userId: string | null;
  isAnonymous: boolean;
}): Promise<VerifiedUpgradeResult> {
  return commitVerifiedUpgrade(session, saveUpgradeProfile);
}

/**
 * While this permanent user is pending_sync: try on mount, focus, and online,
 * then a few backoff delays. Stops after the automatic budget. Does not clear the guest source on failure.
 */
export function useVerifiedUpgradeHandoff() {
  const { ready, userId, isAnonymous } = useAuthUserId();

  useEffect(() => {
    if (!ready || !pendingUpgradeSyncFor(userId, isAnonymous)) return;
    let cancelled = false;
    let attempts = 0;
    let timer = 0;
    let running = false;

    const attempt = async () => {
      if (cancelled || running || !upgradeSyncAttemptAllowed(attempts)) return;
      if (!pendingUpgradeSyncFor(userId, isAnonymous)) return;
      const index = attempts;
      attempts += 1;
      running = true;
      const result = await commitVerifiedUpgrade({ userId, isAnonymous }, async (profile) => {
        const saved = await saveUpgradeProfile(profile);
        if (cancelled) return false;
        return saved;
      });
      running = false;
      if (cancelled || result.status === "adopted" || !pendingUpgradeSyncFor(userId, isAnonymous)) return;
      const delay = nextAutomaticUpgradeDelay(index);
      if (delay == null || !upgradeSyncAttemptAllowed(attempts)) return;
      timer = window.setTimeout(() => { void attempt(); }, delay);
    };

    const onWake = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      void attempt();
    };
    const onOnline = () => {
      window.clearTimeout(timer);
      void attempt();
    };

    void attempt();
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [ready, userId, isAnonymous]);
}
