import { describe, expect, it } from "vitest";
import { downloadMcpImage, MediaError, readImageFiles } from "./media";

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

  it("downloads a ChatGPT image file through the declared file input", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const file = await downloadMcpImage({
      download_url: "https://files.openai.com/example",
      file_id: "file-example",
      mime_type: "image/png",
      file_name: "alimentation.png"
    }, async () => new Response(png, { headers: { "Content-Type": "image/png" } }));
    expect(file.name).toBe("alimentation.png");
    expect(file.type).toBe("image/png");
    expect(file.size).toBe(png.byteLength);
  });

  it("rejects non-HTTPS and private image download URLs", async () => {
    const fetcher = async () => new Response();
    await expect(downloadMcpImage({ download_url: "http://files.openai.com/example", file_id: "file-example" }, fetcher)).rejects.toMatchObject({ code: "invalid_media" });
    await expect(downloadMcpImage({ download_url: "https://127.0.0.1/example", file_id: "file-example" }, fetcher)).rejects.toMatchObject({ code: "invalid_media" });
  });
});
