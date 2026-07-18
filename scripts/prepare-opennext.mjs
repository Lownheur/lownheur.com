import { copyFile, mkdir, writeFile } from "node:fs/promises";
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

// Next.js includes its development-only file logger in the standalone server
// even for production builds. Cloudflare Workers have no writable filesystem,
// and the remaining CommonJS `require("fs")` crashes before the app starts.
// The logger is disabled in production, so replace only the generated copy with
// a compatible no-op implementation before OpenNext bundles the worker.
const fileLoggerPath = resolve(
  root,
  ".next",
  "standalone",
  "node_modules",
  "next",
  "dist",
  "server",
  "dev",
  "browser-logs",
  "file-logger.js"
);

await writeFile(
  fileLoggerPath,
  `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FileLogger {
  initialize() {}
  getLogQueue() { return []; }
  flush() {}
  log() {}
  logServer() {}
  logBrowser() {}
  forceFlush() {}
  destroy() {}
}
let fileLogger = null;
function getFileLogger() {
  if (!fileLogger) fileLogger = new FileLogger();
  return fileLogger;
}
function test__resetFileLogger() { fileLogger = null; }
Object.defineProperties(exports, {
  FileLogger: { enumerable: true, get: () => FileLogger },
  getFileLogger: { enumerable: true, get: () => getFileLogger },
  test__resetFileLogger: { enumerable: true, get: () => test__resetFileLogger }
});
`
);

const consoleDimPath = resolve(
  root,
  ".next",
  "standalone",
  "node_modules",
  "next",
  "dist",
  "server",
  "node-environment-extensions",
  "console-dim.external.js"
);

await writeFile(
  consoleDimPath,
  `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setAbortedLogsStyle() {}
Object.defineProperty(exports, "setAbortedLogsStyle", {
  enumerable: true,
  get: () => setAbortedLogsStyle
});
`
);
