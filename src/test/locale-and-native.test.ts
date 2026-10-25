import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localeFromSignals } from "@/lib/i18n";
import {
  CAMERA_USAGE_ZH,
  authReturnUrl,
  parseNativeAuthUrl,
} from "@/lib/nativeShell";

describe("system language", () => {
  it("follows the system language until the person chooses one", () => {
    expect(localeFromSignals(null, "en-US")).toBe("en-US");
    expect(localeFromSignals(null, "zh-CN")).toBe("zh-CN");
    expect(localeFromSignals(null, "zh-Hant-TW")).toBe("zh-CN");
    expect(localeFromSignals(null, "fr-FR")).toBe("en-US");
    expect(localeFromSignals(null, undefined)).toBe("en-US");
    expect(localeFromSignals("en-US", "zh-CN")).toBe("en-US");
    expect(localeFromSignals("zh-CN", "en-US")).toBe("zh-CN");
  });

  it("keeps privacy and terms in both languages", () => {
    const privacy = readFileSync("src/pages/Privacy.tsx", "utf8");
    const terms = readFileSync("src/pages/Terms.tsx", "utf8");
    expect(privacy).toContain('title: "隐私政策"');
    expect(privacy).toContain('title: "Privacy Policy"');
    expect(terms).toContain('title: "用户协议"');
    expect(terms).toContain('title: "Terms of Service"');
    expect(privacy).toContain('locale === "zh-CN" ? ZH : EN');
    expect(terms).toContain('locale === "zh-CN" ? ZH : EN');
  });
});

describe("native auth return", () => {
  it("keeps the website origin on the web and uses the app scheme on a phone", () => {
    expect(authReturnUrl("/login", { native: false, origin: "https://www.kankanai.cc" })).toBe("https://www.kankanai.cc/login");
    expect(authReturnUrl("/reset-password", { native: false, origin: "https://kankanai.cc/" })).toBe("https://kankanai.cc/reset-password");
    expect(authReturnUrl("/login", { native: true, origin: "https://kankanai.cc" })).toBe("cc.kankanai://login");
    expect(authReturnUrl("/reset-password", { native: true, origin: "capacitor://kankanai.cc" })).toBe("cc.kankanai://reset-password");
  });

  it("reads a verification code or recovery tokens from the app link", () => {
    expect(parseNativeAuthUrl("cc.kankanai://login?code=abc")).toEqual({
      path: "/login",
      code: "abc",
      accessToken: null,
      refreshToken: null,
    });
    expect(parseNativeAuthUrl("cc.kankanai://reset-password#access_token=a&refresh_token=b")).toEqual({
      path: "/reset-password",
      code: null,
      accessToken: "a",
      refreshToken: "b",
    });
    expect(parseNativeAuthUrl("https://kankanai.cc/login?code=abc")).toBeNull();
  });

  it("states the camera purpose in Chinese", () => {
    expect(CAMERA_USAGE_ZH).toContain("拍摄这一餐");
    expect(CAMERA_USAGE_ZH).toContain("不会另存");
  });
});

describe("store channels", () => {
  it("targets API 36 and keeps Google services off the domestic flavor", () => {
    const gradle = readFileSync("android/app/build.gradle", "utf8");
    const versions = readFileSync("android/variables.gradle", "utf8");
    const main = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    const domestic = readFileSync("android/app/src/domestic/AndroidManifest.xml", "utf8");
    const play = readFileSync("android/app/src/play/AndroidManifest.xml", "utf8");
    const root = readFileSync("android/build.gradle", "utf8");
    expect(versions).toContain("compileSdkVersion = 36");
    expect(versions).toContain("targetSdkVersion = 36");
    expect(gradle).toContain("domestic {");
    expect(gradle).toContain("play {");
    expect(gradle).not.toContain("signingConfig");
    expect(gradle).not.toContain("google-services");
    expect(root).not.toContain("google-services");
    expect(main).toContain("android.permission.CAMERA");
    expect(main).toContain('android:scheme="cc.kankanai"');
    expect(main).not.toContain("com.google.android.gms");
    expect(domestic).not.toContain("com.google.android.gms");
    expect(play).toContain("com.google.android.gms.metadata.ModuleDependencies");
    expect(readFileSync("android/app/src/main/res/values/strings.xml", "utf8")).toContain(CAMERA_USAGE_ZH);
  });

  it("asks for the camera in Chinese and reopens the iOS app from mail", () => {
    const plist = readFileSync("ios/App/App/Info.plist", "utf8");
    expect(plist).toContain(`<string>${CAMERA_USAGE_ZH}</string>`);
    expect(plist).toContain("<string>cc.kankanai</string>");
    expect(plist).toContain("NSPhotoLibraryUsageDescription");
  });
});
