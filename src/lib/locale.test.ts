import { describe, expect, it } from "vitest";
import { preferredLocale } from "./locale";

describe("preferredLocale", () => {
  it("uses the highest-quality supported language", () => {
    expect(preferredLocale("de-DE,de;q=0.9,en-US;q=0.8,fr;q=0.7")).toBe("en");
    expect(preferredLocale("en;q=0.4,fr-FR;q=0.9")).toBe("fr");
  });

  it("falls back to French", () => {
    expect(preferredLocale(null)).toBe("fr");
    expect(preferredLocale("de-DE")).toBe("fr");
  });
});
