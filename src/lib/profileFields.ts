export const NICKNAME_MAX = 40;
export const ALLERGIES_MAX = 200;
export const AVATAR_MAX_BYTES = 256 * 1024;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export type ProfileFieldCode = "nickname_too_long" | "allergies_too_long" | "avatar_invalid";

export function avatarWithinLimit(value: string): boolean {
  const match = DATA_URL.exec(value.trim());
  if (!match) return false;
  const b64 = match[2].replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) return false;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  return bytes > 0 && bytes <= AVATAR_MAX_BYTES;
}

export function avatarFileAllowed(file: { type: string; size: number }): boolean {
  return file.size > 0
    && file.size <= AVATAR_MAX_BYTES
    && /^(image\/jpeg|image\/png|image\/webp)$/.test(file.type);
}

/** Validates only the fields the caller is writing. Absent fields are left alone. */
export function profileFieldError(input: {
  nickname?: unknown;
  allergies?: unknown;
  avatar_url?: unknown;
}): ProfileFieldCode | null {
  if (input.nickname !== undefined && input.nickname !== null) {
    if (typeof input.nickname !== "string" || input.nickname.trim().length > NICKNAME_MAX) {
      return "nickname_too_long";
    }
  }
  if (input.allergies !== undefined && input.allergies !== null) {
    if (typeof input.allergies !== "string" || input.allergies.trim().length > ALLERGIES_MAX) {
      return "allergies_too_long";
    }
  }
  if (input.avatar_url !== undefined && input.avatar_url !== null && input.avatar_url !== "") {
    if (typeof input.avatar_url !== "string" || !avatarWithinLimit(input.avatar_url)) return "avatar_invalid";
  }
  return null;
}
