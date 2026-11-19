import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(appRoot, "../djangobackend");
const projectRoot = path.resolve(backend, "..");
const expoCli = path.join(appRoot, "node_modules/expo/bin/cli");

function venvPython() {
  const folder = process.platform === "win32" ? path.join("Scripts", "python.exe") : path.join("bin", "python");
  const candidates = [
    path.join(backend, ".venv", folder),
    path.join(projectRoot, ".venv", folder),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function windowsPython() {
  const where = spawnSync("where.exe", ["py"], { encoding: "utf8" });
  if (where.status !== 0) return null;
  const exe = where.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.toLowerCase().includes("windowsapps"));
  return exe && existsSync(exe) ? exe : null;
}

function pythonLaunch() {
  const venv = venvPython();
  if (venv) return { command: venv, prefix: [] };
  if (process.platform === "win32") {
    const launcher = windowsPython();
    if (launcher) return { command: launcher, prefix: ["-3"] };
    return null;
  }
  return { command: "python3", prefix: [] };
}

function pythonMissing() {
  console.error("");
  console.error("Python was not found. Windows is opening the Store alias instead of Python.");
  console.error("Install Python, close this terminal, open a new one, then run:");
  console.error("");
  console.error("  winget install -e --id Python.Python.3.12");
  console.error("  cd $env:USERPROFILE\\data5570_mycode\\finalproject");
  console.error("  py -3 -m venv .venv");
  console.error("  .\\.venv\\Scripts\\python -m pip install -r djangobackend\\requirements.txt");
  console.error("  .\\.venv\\Scripts\\python djangobackend\\manage.py migrate");
  console.error("  .\\.venv\\Scripts\\python djangobackend\\manage.py seed_demo");
  console.error("  cd dailychallenge");
  console.error("  npm run web");
  console.error("");
}

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

const python = pythonLaunch();
let django;
if (!(await apiIsUp())) {
  if (!python) {
    pythonMissing();
  } else {
    const migrated = spawnSync(python.command, [...python.prefix, "manage.py", "migrate", "--noinput"], {
      cwd: backend,
      stdio: "inherit",
    });
    if (migrated.status !== 0) {
      const pip =
        process.platform === "win32"
          ? ".\\.venv\\Scripts\\python -m pip install -r djangobackend\\requirements.txt"
          : ".venv/bin/python -m pip install -r djangobackend/requirements.txt";
      console.error("Django migrate failed. Install the packages, then start the app again:");
      console.error(`  ${pip}`);
    } else {
      django = start(python.command, [...python.prefix, "manage.py", "runserver", "127.0.0.1:8042"], backend);
      for (let attempt = 0; attempt < 40 && !(await apiIsUp()); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!(await apiIsUp())) {
        console.error("Django did not start on 127.0.0.1:8042.");
      }
    }
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
