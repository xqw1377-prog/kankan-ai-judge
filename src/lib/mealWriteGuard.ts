const generations = new Map<string, number>();

function deletedKey(scope: string) {
  return `kankan_scope_deleted_${scope}`;
}

/** Bumps when an account is deleted so an in-flight fetch cannot commit. */
export function localWriteGeneration(scope: string): number {
  return generations.get(scope) ?? 0;
}

export function bumpLocalWriteGeneration(scope: string): number {
  const next = localWriteGeneration(scope) + 1;
  generations.set(scope, next);
  return next;
}

/** Blocks later remote→local writes for this account, including ones already in flight. */
export function markScopeDeleted(scope: string) {
  localStorage.setItem(deletedKey(scope), "1");
  bumpLocalWriteGeneration(scope);
}

export function isScopeDeleted(scope: string): boolean {
  return localStorage.getItem(deletedKey(scope)) === "1";
}

export function allowRemoteLocalWrite(scope: string, generation: number): boolean {
  return !isScopeDeleted(scope) && generation === localWriteGeneration(scope);
}

export function resetLocalWriteGuard() {
  generations.clear();
}
