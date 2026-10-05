import { lazy, type ComponentType } from "react";

/** Retry a route chunk once so a transient Vite cache miss does not blank the page. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (first) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        return await factory();
      } catch {
        throw first;
      }
    }
  });
}
