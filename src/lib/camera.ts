import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

/**
 * Take a photo using Capacitor Camera plugin on native,
 * or fall back to file input on web.
 * Returns a base64 data URL string, or null if cancelled.
 */
export async function takePhoto(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // lets user choose camera or gallery
        correctOrientation: true,
      });
      return photo.dataUrl ?? null;
    } catch {
      // User cancelled or permission denied
      return null;
    }
  }
  return pickFile(true);
}

/**
 * Pick a photo from gallery only.
 */
export async function pickPhoto(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
      });
      return photo.dataUrl ?? null;
    } catch {
      return null;
    }
  }
  return pickFile(false);
}

function pickFile(capture: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", "environment");
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => finish(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => finish(null);
      reader.readAsDataURL(file);
    });
    input.addEventListener("cancel", () => finish(null));
    input.click();
  });
}
