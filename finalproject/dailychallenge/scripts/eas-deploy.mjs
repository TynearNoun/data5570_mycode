import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = path.join(appRoot, "node_modules/expo/bin/cli");

const env = {
  ...process.env,
  EXPO_PUBLIC_DJANGO_API_URL:
    process.env.EXPO_PUBLIC_DJANGO_API_URL || "http://13.56.184.13:8000/api",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [expoCli, "export", "--platform", "web"]);

if (!existsSync(path.join(appRoot, "dist"))) {
  console.error('No "dist/" folder was created. expo export --platform web did not finish.');
  process.exit(1);
}

run("eas", ["deploy", "--prod"], { shell: process.platform === "win32" });
