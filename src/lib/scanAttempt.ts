/** Stable for the same photos so a lost response retries the same server attempt. */
export function scanAttemptKey(images: string[]): string {
  const marker = images.map((image) => `${image.length}:${image.slice(0, 24)}`).join("|");
  const storageKey = `kankan_scan_attempt:${marker}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return marker.slice(0, 80);
  }
}
