import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(appRoot, "../djangobackend");
const venvPython =
  process.platform === "win32"
    ? path.join(backend, "../.venv/Scripts/python.exe")
    : path.join(backend, "../.venv/bin/python");
const python = existsSync(venvPython) ? venvPython : process.platform === "win32" ? "python" : "python3";
const expoCli = path.join(appRoot, "node_modules/expo/bin/cli");

async function apiIsUp() {
  try {
    const response = await fetch("http://127.0.0.1:8042/api/health/");
    return response.ok;
  } catch {
    return false;
  }
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit" });
  child.on("error", (error) => {
    console.error(error.message);
  });
  return child;
}

let django;
if (!(await apiIsUp())) {
  django = start(python, ["manage.py", "runserver", "127.0.0.1:8042"], backend);
  for (let attempt = 0; attempt < 40 && !(await apiIsUp()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!(await apiIsUp())) {
    console.error("Django did not start. From finalproject/djangobackend: python manage.py runserver 127.0.0.1:8042");
  }
}

const expo = start(process.execPath, [expoCli, "start", "--web", "--port", "8091", "--host", "localhost"], appRoot);

function stop() {
  expo.kill("SIGTERM");
  django?.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
expo.on("exit", (code) => {
  django?.kill("SIGTERM");
  process.exit(code ?? 0);
});
