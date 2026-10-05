/** SHA-256 of the full image payloads. The same photos retry the same server attempt. */
export async function scanAttemptKey(images: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(images.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
