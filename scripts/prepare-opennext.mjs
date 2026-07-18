import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(root, ".next", "server");
const targetDirectory = resolve(root, ".next", "standalone", ".next", "server");

await mkdir(targetDirectory, { recursive: true });

for (const filename of ["middleware.js", "middleware.js.map"]) {
  await copyFile(
    resolve(sourceDirectory, filename),
    resolve(targetDirectory, filename)
  ).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}
