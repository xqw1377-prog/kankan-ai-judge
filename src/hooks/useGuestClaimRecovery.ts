import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readClaimToken, retryStoredGuestClaim } from "@/lib/guestClaim";
import { adoptGuestLocalData } from "@/lib/guestHandoff";
import { useAuthUserId } from "@/hooks/useAuthUser";

async function invokeClaim(token: string) {
  const result = await supabase.functions.invoke("claim-guest-meal", { body: { action: "claim", token } });
  const status = result.data && typeof result.data === "object" ? (result.data as { status?: unknown }).status : "";
  return { error: result.error, status };
}

/** Retries a stored guest-meal claim once when a real account session is ready. */
export function useGuestClaimRecovery() {
  const { ready, userId, isAnonymous } = useAuthUserId();
  const [needsRetry, setNeedsRetry] = useState(false);
  const [pending, setPending] = useState(false);

  const finish = useCallback(async (user: string) => {
    const result = await retryStoredGuestClaim(invokeClaim);
    if (result === "claimed") {
      adoptGuestLocalData(user, { includeProfile: false });
      setNeedsRetry(false);
      return;
    }
    setNeedsRetry(result === "failed" && Boolean(readClaimToken()));
  }, []);

  useEffect(() => {
    if (!ready || !userId || isAnonymous || !readClaimToken()) return;
    let cancelled = false;
    setPending(true);
    finish(userId).finally(() => {
      if (!cancelled) setPending(false);
    });
    return () => { cancelled = true; };
  }, [finish, isAnonymous, ready, userId]);

  const retry = useCallback(async () => {
    if (!userId || isAnonymous) return;
    setPending(true);
    try {
      await finish(userId);
    } finally {
      setPending(false);
    }
  }, [finish, isAnonymous, userId]);

  return { needsRetry, pending, retry };
}
