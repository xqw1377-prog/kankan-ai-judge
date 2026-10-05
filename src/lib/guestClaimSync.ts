const listeners = new Set<() => void>();

/** Mounted meal lists and day summaries refetch after a server claim. */
export function subscribeGuestClaim(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyGuestClaimed() {
  listeners.forEach((listener) => listener());
}
