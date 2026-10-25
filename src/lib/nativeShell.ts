import { Capacitor } from "@capacitor/core";

/** Same id as the App Store bundle. Custom scheme so verification mail can reopen the app. */
export const NATIVE_AUTH_SCHEME = "cc.kankanai";

export const CAMERA_USAGE_ZH =
  "用于拍摄这一餐的食物照片，只供这一次估算热量、蛋白质、脂肪和碳水。照片不会另存进文件库。";
export const PHOTO_LIBRARY_USAGE_ZH =
  "用于从相册选择这一餐的食物照片，只供这一次估算。不会浏览相册里的其他内容。";
export const PHOTO_LIBRARY_ADD_USAGE_ZH =
  "本应用不会把食物照片写入相册。若系统仍询问，只是为了完成你刚选择的这一张照片。";

export type AuthReturnPath = "/login" | "/reset-password";

/** Web keeps the current site origin. Native mail must return through the app scheme. */
export function authReturnUrl(path: AuthReturnPath, env?: { native: boolean; origin: string }): string {
  const native = env?.native ?? Capacitor.isNativePlatform();
  const origin = (env?.origin ?? window.location.origin).replace(/\/$/, "");
  if (native) return `${NATIVE_AUTH_SCHEME}://${path.slice(1)}`;
  return `${origin}${path}`;
}

export interface NativeAuthLink {
  path: AuthReturnPath;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/** Parses cc.kankanai://login?code= and cc.kankanai://reset-password#access_token=. */
export function parseNativeAuthUrl(raw: string): NativeAuthLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${NATIVE_AUTH_SCHEME}:`) return null;
  const hostPath = `${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, "");
  const path: AuthReturnPath | null = hostPath === "reset-password"
    ? "/reset-password"
    : hostPath === "login" || hostPath === ""
      ? "/login"
      : null;
  if (!path) return null;
  const query = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const read = (key: string) => query.get(key) || hash.get(key);
  return {
    path,
    code: read("code"),
    accessToken: read("access_token"),
    refreshToken: read("refresh_token"),
  };
}

type Remove = () => void;

/**
 * Completes an email link inside the WebView. The system browser does not share this session.
 * Supabase must allow cc.kankanai://login and cc.kankanai://reset-password.
 */
export async function installNativeAuthLinks(navigate: (path: AuthReturnPath) => void): Promise<Remove> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import("@capacitor/app");
  const { supabase } = await import("@/integrations/supabase/client");
  const handle = async (raw: string | undefined) => {
    if (!raw) return;
    const link = parseNativeAuthUrl(raw);
    if (!link) return;
    if (link.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(link.code);
      if (error) return;
    } else if (link.accessToken && link.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: link.accessToken,
        refresh_token: link.refreshToken,
      });
      if (error) return;
    }
    navigate(link.path);
  };
  const launch = await App.getLaunchUrl();
  await handle(launch?.url);
  const listener = await App.addListener("appUrlOpen", (event) => {
    void handle(event.url);
  });
  return () => {
    void listener.remove();
  };
}

/** Android may kill the app while the camera activity is open. Restore that photo into /scan. */
export async function installCameraRestore(onPhoto: (dataUrl: string) => void): Promise<Remove> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import("@capacitor/app");
  const listener = await App.addListener("appRestoredResult", (event) => {
    if (event.pluginId !== "Camera" || !event.success) return;
    const data = event.data as { dataUrl?: unknown } | undefined;
    if (typeof data?.dataUrl === "string" && data.dataUrl.startsWith("data:image/")) onPhoto(data.dataUrl);
  });
  return () => {
    void listener.remove();
  };
}
