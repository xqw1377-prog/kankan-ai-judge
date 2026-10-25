import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Bundle id matches the live App Store app KanKanAI (6760216922): cc.kankanai.
 * It is not declared anywhere else in this repo. Confirm before shipping an update.
 *
 * The WebView origin is https://kankanai.cc on Android and capacitor://kankanai.cc on iOS,
 * so the Turnstile hostname matches the public site key. Mail links use cc.kankanai://
 * so they reopen this app instead of the mobile browser.
 */
const config: CapacitorConfig = {
  appId: "cc.kankanai",
  appName: "KanKanAI",
  webDir: "dist",
  server: {
    hostname: "kankanai.cc",
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
    scheme: "KanKanAI",
  },
};

export default config;
