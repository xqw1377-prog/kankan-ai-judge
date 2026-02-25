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
  // Web fallback: use file input
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    };
    // Handle cancel
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(() => {
        if (!input.files?.length) resolve(null);
      }, 500);
    };
    window.addEventListener("focus", onFocus);
    input.click();
  });
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
  // Web fallback without capture
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    };
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(() => {
        if (!input.files?.length) resolve(null);
      }, 500);
    };
    window.addEventListener("focus", onFocus);
    input.click();
  });
}
