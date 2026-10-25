import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// Existing tests assert the Chinese copy. The app itself follows the system
// language; this pin keeps the suite on zh-CN unless a test saves a choice.
beforeEach(() => {
  localStorage.removeItem("kankan-locale");
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: "zh-CN",
  });
});

// The real public Turnstile site key is committed in .env for Lovable/Vercel builds.
// Unit tests run without it (non-production, no challenge) unless a test stubs one.
vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
