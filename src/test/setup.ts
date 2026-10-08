import "@testing-library/jest-dom";
import { vi } from "vitest";

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
