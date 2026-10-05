/** True only when the request carries a non-empty bearer token. */
export function hasUserBearer(authorization: string | null): boolean {
  return /^Bearer\s+\S+$/i.test(authorization ?? "");
}
