import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  readPasswordSetupPending,
  requestAnonymousEmailUpgrade,
  submitUpgradePassword,
  upgradeEmailRedirect,
} from "@/lib/anonymousUpgrade";
import { deleteSignedInAccount } from "@/lib/deleteAccount";
import { rememberPendingClaim, readPendingClaim } from "@/lib/guestClaim";
import { readUpgradeHandoff } from "@/lib/guestHandoff";
import { readMeals, writeMeals, type StoredMeal } from "@/lib/localData";
import { AVATAR_MAX_BYTES, avatarFileAllowed, profileFieldError } from "@/lib/profileFields";

function meal(id: string, name: string): StoredMeal {
  return {
    id,
    food_name: name,
    meal_type: "lunch",
    calories: 1,
    protein_g: 1,
    fat_g: 1,
    carbs_g: 1,
    ingredients: [],
    verdict: "",
    suggestion: "",
    recorded_at: "2026-10-06T00:00:00.000Z",
    sequence_score: null,
  };
}

describe("anonymous email upgrade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sends only the email, then sets the password without storing it", async () => {
    const secret = "s3cret-password";
    let emailCall: unknown[] = [];
    const sent = await requestAnonymousEmailUpgrade({
      email: " guest@example.com ",
      redirectTo: upgradeEmailRedirect("https://app.example/"),
      anonymousUserId: "anon-1",
      updateEmail: async (email, redirectTo) => {
        emailCall = [email, redirectTo];
        return { userId: "anon-1", isAnonymous: true, error: null };
      },
    });
    expect(sent.status).toBe("verification_sent");
    expect(emailCall).toEqual(["guest@example.com", "https://app.example/login"]);
    expect(readUpgradeHandoff()).toEqual({ anonymousUserId: "anon-1", state: "pending_verification" });
    expect(readPasswordSetupPending()).toEqual({ userId: "anon-1" });
    expect(JSON.stringify(localStorage)).not.toContain(secret);

    let passwordCall = "";
    const saved = await submitUpgradePassword({
      password: secret,
      updatePassword: async (password) => {
        passwordCall = password;
        return { error: null };
      },
    });
    expect(saved.status).toBe("saved");
    expect(passwordCall).toBe(secret);
    expect(readPasswordSetupPending()).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain(secret);
    expect(readFileSync("src/pages/Login.tsx", "utf8")).not.toMatch(/updateUser\(\{\s*email,\s*password/);
  });

  it("rejects a user id change and does not keep a handoff", async () => {
    const result = await requestAnonymousEmailUpgrade({
      email: "guest@example.com",
      redirectTo: "https://app.example/login",
      anonymousUserId: "anon-1",
      updateEmail: async () => ({ userId: "other", isAnonymous: false, error: null }),
    });
    expect(result.status).toBe("rejected");
    expect(readUpgradeHandoff()).toBeNull();
    expect(readPasswordSetupPending()).toBeNull();
  });
});

describe("account deletion", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears this user's local data only after the server confirms deletion", async () => {
    const userId = "user-delete";
    writeMeals(userId, [meal("m1", "午饭")]);
    rememberPendingClaim("tok", userId);
    localStorage.setItem("kankan_guest_upgrade_handoff", JSON.stringify({ anonymousUserId: userId, state: "pending_verification" }));
    localStorage.setItem("kankan_upgrade_password_setup", JSON.stringify({ userId }));
    let signedOut = false;
    const failed = await deleteSignedInAccount({
      userId,
      invoke: async () => ({ data: null, error: new Error("no") }),
      signOut: async () => {
        signedOut = true;
      },
    });
    expect(failed).toBe("failed");
    expect(signedOut).toBe(false);
    expect(readMeals(userId)).toHaveLength(1);

    const deleted = await deleteSignedInAccount({
      userId,
      invoke: async () => ({ data: { deleted: true }, error: null }),
      signOut: async () => {
        signedOut = true;
      },
    });
    expect(deleted).toBe("deleted");
    expect(signedOut).toBe(true);
    expect(readMeals(userId)).toEqual([]);
    expect(readPendingClaim()).toBeNull();
    expect(readUpgradeHandoff()).toBeNull();
    expect(readPasswordSetupPending()).toBeNull();
  });

  it("wires deletion through a verified user before the service role", () => {
    const fn = readFileSync("supabase/functions/delete-account/index.ts", "utf8");
    const guard = readFileSync("supabase/functions/_shared/guard.ts", "utf8");
    expect(fn.indexOf("requireUser")).toBeLessThan(fn.indexOf("serviceDb"));
    expect(fn).toContain("purge_user_owned_rows");
    expect(fn).toContain("auth.admin.deleteUser(auth.userId)");
    expect(fn).not.toContain("body.userId");
    expect(guard).toContain("auth.getUser");
    expect(readFileSync("src/pages/Profile.tsx", "utf8")).toContain('data-testid="delete-account"');
    expect(readFileSync("src/pages/Profile.tsx", "utf8")).toContain("t.accountAndData");
    const privacy = readFileSync("src/pages/Privacy.tsx", "utf8");
    expect(privacy).toContain("账号与数据");
    expect(privacy).not.toContain("通过应用内反馈申请删除");
    expect(readFileSync("src/pages/Terms.tsx", "utf8")).toContain("每个匿名身份可以免费分析一次");
    expect(readFileSync("src/App.tsx", "utf8")).toContain('path="/terms"');
    expect(readFileSync("src/pages/Login.tsx", "utf8")).toContain('to="/terms"');
    expect(readFileSync("src/pages/Login.tsx", "utf8")).toContain('to="/privacy"');
    expect(readFileSync("package.json", "utf8")).not.toContain("drizzle");
    expect(readFileSync("package.json", "utf8")).not.toContain("postgres");
  });
});

describe("profile field limits", () => {
  it("rejects long nickname, long allergies, and avatars that are not a small jpeg png or webp", () => {
    expect(profileFieldError({ nickname: "甲".repeat(40) })).toBeNull();
    expect(profileFieldError({ nickname: "甲".repeat(41) })).toBe("nickname_too_long");
    expect(profileFieldError({ allergies: "花".repeat(200) })).toBeNull();
    expect(profileFieldError({ allergies: "花".repeat(201) })).toBe("allergies_too_long");
    expect(profileFieldError({ avatar_url: "data:image/jpeg;base64,aaaa" })).toBeNull();
    expect(profileFieldError({ avatar_url: "data:image/svg+xml;base64,aaaa" })).toBe("avatar_invalid");
    const huge = "A".repeat(Math.ceil((AVATAR_MAX_BYTES + 1) / 3) * 4);
    expect(profileFieldError({ avatar_url: `data:image/png;base64,${huge}` })).toBe("avatar_invalid");
    expect(profileFieldError({})).toBeNull();
    expect(avatarFileAllowed({ type: "image/jpeg", size: AVATAR_MAX_BYTES })).toBe(true);
    expect(avatarFileAllowed({ type: "image/gif", size: 10 })).toBe(false);
    expect(avatarFileAllowed({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toBe(false);
    expect(readFileSync("src/lib/profileFields.ts", "utf8")).toBe(
      readFileSync("supabase/functions/_shared/profileFields.ts", "utf8"),
    );
    expect(readFileSync("supabase/functions/save-profile/index.ts", "utf8")).toContain("profileFieldError");
    const guard = readFileSync("supabase/functions/_shared/guard.ts", "utf8");
    expect(guard).toContain("consume_hourly_ai_slot");
    expect(guard).not.toContain("count: \"exact\"");
  });
});
