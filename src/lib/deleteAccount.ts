import { clearPasswordSetupPending } from "@/lib/anonymousUpgrade";
import { forgetPendingClaim } from "@/lib/guestClaim";
import { clearUpgradeHandoff } from "@/lib/guestHandoff";
import { clearGuestLocalData, clearScopedLocalData } from "@/lib/localData";
import { markScopeDeleted } from "@/lib/mealWriteGuard";

export async function deleteSignedInAccount(input: {
  userId: string;
  invoke: () => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
}): Promise<"deleted" | "failed"> {
  const result = await input.invoke();
  const deleted = result.data && typeof result.data === "object"
    ? (result.data as { deleted?: unknown }).deleted === true
    : false;
  if (result.error || !deleted) return "failed";
  markScopeDeleted(input.userId);
  clearScopedLocalData(input.userId);
  clearGuestLocalData();
  clearUpgradeHandoff();
  clearPasswordSetupPending();
  forgetPendingClaim();
  await input.signOut();
  return "deleted";
}
