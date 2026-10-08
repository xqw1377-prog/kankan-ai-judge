/** Automatic save-profile retries after a verified upgrade stays pending_sync. */
export const UPGRADE_SYNC_BACKOFF_MS = [1_000, 4_000, 12_000] as const;

/** Immediate attempt plus one follow-up for each backoff delay. */
export const UPGRADE_SYNC_AUTOMATIC_LIMIT = UPGRADE_SYNC_BACKOFF_MS.length + 1;

export function upgradeSyncAttemptAllowed(attemptsUsed: number): boolean {
  return attemptsUsed < UPGRADE_SYNC_AUTOMATIC_LIMIT;
}

/** Delay after a failed attempt at this 0-based index. Null when the budget is spent. */
export function nextAutomaticUpgradeDelay(failedAttemptIndex: number): number | null {
  return UPGRADE_SYNC_BACKOFF_MS[failedAttemptIndex] ?? null;
}
