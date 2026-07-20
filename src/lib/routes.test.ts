import { describe, expect, it } from "vitest";
import { localizedPath, notFoundHtml } from "./routes";

describe("localizedPath", () => {
  it("keeps every public and dashboard V1 route", () => {
    expect(localizedPath("/fr")).toEqual({ locale: "fr", known: true });
    expect(localizedPath("/fr/dashboard/categories")).toEqual({ locale: "fr", known: true });
    expect(localizedPath("/en/privacy")).toEqual({ locale: "en", known: true });
  });

  it("marks unknown localized paths for the custom 404", () => {
    expect(localizedPath("/fr/unknown")).toEqual({ locale: "fr", known: false });
    expect(localizedPath("/en/dashboard/unknown")).toEqual({ locale: "en", known: false });
    expect(localizedPath("/fr/one/two/three")).toEqual({ locale: "fr", known: false });
  });

  it("renders a localized standalone 404 response", () => {
    expect(notFoundHtml("fr")).toContain("Page introuvable");
    expect(notFoundHtml("fr")).toContain('href="/fr"');
    expect(notFoundHtml("en")).toContain("Page not found");
  });
});
