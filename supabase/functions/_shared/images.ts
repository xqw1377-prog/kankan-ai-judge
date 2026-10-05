/** Keep in sync with src/lib/imageGuard.ts */
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export interface ParsedImage {
  mime: string;
  data: string;
}

export function parseImages(body: { imagesBase64?: unknown; imageBase64?: unknown }):
  | { ok: true; images: ParsedImage[] }
  | { ok: false; status: number; error: string } {
  const raw: unknown[] = [];
  if (Array.isArray(body.imagesBase64)) raw.push(...body.imagesBase64);
  else if (typeof body.imageBase64 === "string") raw.push(body.imageBase64);

  if (raw.length === 0) return { ok: false, status: 400, error: "没有图片" };
  if (raw.length > MAX_IMAGES) return { ok: false, status: 400, error: "最多 5 张图片" };

  const images: ParsedImage[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) {
      return { ok: false, status: 400, error: "图片格式不正确" };
    }
    const parsed = parseOne(item.trim());
    if (!parsed) return { ok: false, status: 400, error: "只支持 JPEG、PNG、WebP、HEIC 图片" };
    if (parsed.bytes > MAX_IMAGE_BYTES) return { ok: false, status: 400, error: "单张图片不能超过 4MB" };
    images.push({ mime: parsed.mime, data: parsed.data });
  }
  return { ok: true, images };
}

function parseOne(value: string): { mime: string; data: string; bytes: number } | null {
  const match = value.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const data = match[2].replace(/\s/g, "");
  if (!ALLOWED.has(mime)) return null;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((data.length * 3) / 4) - padding;
  if (bytes <= 0) return null;
  return { mime, data, bytes };
}

export function toImageContents(images: ParsedImage[]) {
  return images.map((image) => ({
    type: "image_url" as const,
    image_url: { url: `data:${image.mime};base64,${image.data}` },
  }));
}
