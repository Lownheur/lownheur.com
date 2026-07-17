import { describe, expect, it } from "vitest";
import { MediaError, readImageFiles } from "./media";

function formWith(files: File[]) {
  const data = new FormData();
  for (const file of files) data.append("images", file);
  return data;
}

describe("media input validation", () => {
  it("accepts supported private image formats", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.webp", {
      type: "image/webp"
    });
    expect(readImageFiles(formWith([file]))).toEqual([file]);
  });

  it("rejects unsupported formats", () => {
    const file = new File(["svg"], "vector.svg", { type: "image/svg+xml" });
    expect(() => readImageFiles(formWith([file]))).toThrowError(MediaError);
  });

  it("rejects files larger than ten megabytes", () => {
    const file = new File(["x"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 10_485_761 });
    expect(() => readImageFiles(formWith([file]))).toThrowError(
      expect.objectContaining({ code: "invalid_media" })
    );
  });

  it("limits each upload request to five images", () => {
    const files = Array.from(
      { length: 6 },
      (_, index) => new File(["x"], index + ".png", { type: "image/png" })
    );
    expect(() => readImageFiles(formWith(files))).toThrowError(
      expect.objectContaining({ code: "invalid_media" })
    );
  });
});
