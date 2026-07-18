import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const openNextDirectory = resolve(root, ".open-next");
const distributionDirectory = resolve(root, "dist");
const serverDirectory = resolve(distributionDirectory, "server");
const clientDirectory = resolve(distributionDirectory, "client");

await rm(distributionDirectory, { recursive: true, force: true });
await mkdir(serverDirectory, { recursive: true });
await mkdir(resolve(distributionDirectory, ".openai"), { recursive: true });

await cp(openNextDirectory, resolve(serverDirectory, ".open-next"), {
  recursive: true
});
await cp(resolve(openNextDirectory, "assets"), clientDirectory, {
  recursive: true
});
await writeFile(
  resolve(serverDirectory, "index.js"),
  `import { createRequire } from "node:module";
globalThis.require ??= createRequire(import.meta.url);
const { default: worker } = await import("./.open-next/worker.js");
export default worker;
`,
  "utf8"
);
await copyFile(
  resolve(root, ".openai", "hosting.json"),
  resolve(distributionDirectory, ".openai", "hosting.json")
);
