import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeBaseUrl = (value) => value.replace(/\/$/, "");

const getAvailablePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolve(port));
        return;
      }
      server.close(() => reject(new Error("Unable to determine open port")));
    });
    server.on("error", reject);
  });

const waitForHealth = async (baseUrl, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/api/health", baseUrl));
      if (response.ok) return;
      lastError = new Error(`Health check failed: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw lastError ?? new Error("Health check timed out");
};

const startLocalServer = async () => {
  const buildResult = spawnSync(npmCommand, ["run", "build"], {
    stdio: "inherit",
    env: process.env,
  });

  if (buildResult.status !== 0) {
    throw new Error("npm run build failed");
  }

  const port = await getAvailablePort();
  const child = spawn(npmCommand, ["run", "start", "--", "-p", String(port)], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  const baseUrl = `http://localhost:${port}`;
  await waitForHealth(baseUrl);

  const stop = async () =>
    new Promise((resolve) => {
      if (child.killed || child.exitCode !== null) {
        resolve();
        return;
      }
      let settled = false;
      const timeoutMs = 5000;
      let timer;
      const settle = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve();
      };

      child.once("exit", settle);

      try {
        child.kill();
      } catch {}

      timer = setTimeout(() => {
        if (settled) return;
        if (process.platform === "win32") {
          if (!child.pid) {
            settle();
            return;
          }
          try {
            const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
              stdio: "ignore",
            });
            killer.once("exit", settle);
            killer.once("error", settle);
          } catch {
            settle();
          }
          return;
        }
        try {
          child.kill("SIGKILL");
        } catch {}
        settle();
      }, timeoutMs);
    });

  return { baseUrl, stop, local: true };
};

const resolveBaseUrl = async () => {
  if (process.env.SMOKE_BASE_URL) {
    return {
      baseUrl: normalizeBaseUrl(process.env.SMOKE_BASE_URL),
      stop: async () => {},
      local: false,
    };
  }

  return startLocalServer();
};

export { normalizeBaseUrl, resolveBaseUrl, waitForHealth };
