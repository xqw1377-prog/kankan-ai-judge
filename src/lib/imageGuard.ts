/** Keep in sync with supabase/functions/_shared/images.ts */
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function inspectImage(value: string): { ok: true } | { ok: false; error: string } {
  const match = value.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  const mime = (match ? match[1] : "").toLowerCase();
  const data = (match ? match[2] : "").replace(/\s/g, "");
  if (!match || !ALLOWED.has(mime)) return { ok: false, error: "只支持 JPEG、PNG、WebP、HEIC 图片" };
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((data.length * 3) / 4) - padding;
  if (bytes <= 0) return { ok: false, error: "图片格式不正确" };
  if (bytes > MAX_IMAGE_BYTES) return { ok: false, error: "单张图片不能超过 4MB" };
  return { ok: true };
}

export function inspectImages(values: string[]): { ok: true } | { ok: false; error: string } {
  if (values.length === 0) return { ok: false, error: "没有图片" };
  if (values.length > MAX_IMAGES) return { ok: false, error: "最多 5 张图片" };
  for (const value of values) {
    const result = inspectImage(value);
    if (!result.ok) return result;
  }
  return { ok: true };
}
