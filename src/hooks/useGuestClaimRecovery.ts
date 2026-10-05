import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptClaimedGuestMeals,
  applyPendingClaimSession,
  readPendingClaim,
  retryStoredGuestClaim,
} from "@/lib/guestClaim";
import { useAuthUserId } from "@/hooks/useAuthUser";

async function invokeClaim(token: string) {
  const result = await supabase.functions.invoke("claim-guest-meal", { body: { action: "claim", token } });
  const status = result.data && typeof result.data === "object" ? (result.data as { status?: unknown }).status : "";
  return { error: result.error, status };
}

/** Retries a stored guest-meal claim only for the account the token was issued toward. */
export function useGuestClaimRecovery() {
  const { ready, userId, isAnonymous } = useAuthUserId();
  const [needsRetry, setNeedsRetry] = useState(false);
  const [pending, setPending] = useState(false);

  const finish = useCallback(async (user: string) => {
    const gate = applyPendingClaimSession({ userId: user, isAnonymous: false });
    if (gate !== "retry") {
      setNeedsRetry(false);
      return;
    }
    const result = await retryStoredGuestClaim(invokeClaim, user);
    if (result === "claimed") {
      acceptClaimedGuestMeals(user);
      setNeedsRetry(false);
      return;
    }
    setNeedsRetry(result === "failed" && Boolean(readPendingClaim()));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const gate = applyPendingClaimSession({ userId, isAnonymous });
    if (gate === "clear" || gate === "skip") {
      setNeedsRetry(false);
      return;
    }
    if (!userId) return;
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
