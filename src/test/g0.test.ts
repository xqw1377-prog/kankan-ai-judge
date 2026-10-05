import { describe, expect, it } from "vitest";
import { inspectImage, inspectImages, MAX_IMAGES } from "@/lib/imageGuard";
import { isPlaceholderAnalysis } from "@/lib/foodAnalysis";
import { homeGate } from "@/lib/homeGate";

function dataUrl(mime: string, bytes: number) {
  const raw = "A".repeat(bytes);
  return `data:${mime};base64,${btoa(raw)}`;
}

describe("image guard", () => {
  it("rejects a sixth image and a non-image", () => {
    const one = dataUrl("image/jpeg", 8);
    expect(inspectImages(Array.from({ length: MAX_IMAGES + 1 }, () => one)).ok).toBe(false);
    expect(inspectImage("data:text/plain;base64,YQ==").ok).toBe(false);
  });

  it("accepts a small jpeg", () => {
    expect(inspectImage(dataUrl("image/jpeg", 8)).ok).toBe(true);
  });
});

describe("analysis placeholder", () => {
  it("does not treat zero-calorie 未知食物 as a result", () => {
    expect(isPlaceholderAnalysis({
      food: "未知食物",
      calories: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      verdict: "AI error",
    })).toBe(true);
  });
});

describe("guest gate", () => {
  it("lets a guest open home without a session", () => {
    expect(homeGate({ hasSession: false, isGuest: true })).toBe("home");
    expect(homeGate({ hasSession: false, isGuest: false })).toBe("login");
  });
});
