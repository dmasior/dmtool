import { app, shell, dialog, BrowserWindow } from "electron";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";

const TOKEN_FILE = path.join(app.getPath("home"), ".dmtool", "github-auth.json");
const CLIENT_ID = "Iv1.b507a08c87ecfe98";
const SCOPE = "copilot";
const MAX_POLL_MS = 15 * 60 * 1000;

let pollAbortController = null;

export function saveToken(oauthToken, selectedModel) {
  writeFileSync(TOKEN_FILE, JSON.stringify({ oauthToken, selectedModel }), "utf-8");
}

export function loadToken() {
  if (!existsSync(TOKEN_FILE)) return null;

  try {
    return JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
  } catch {
    deleteToken();
    return null;
  }
}

export function deleteToken() {
  if (existsSync(TOKEN_FILE)) unlinkSync(TOKEN_FILE);
}

export function cancelDeviceFlow() {
  if (pollAbortController) {
    pollAbortController.abort();
    pollAbortController = null;
  }
}

export async function startDeviceFlow() {
  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPE }),
  });

  if (!codeRes.ok) throw new Error("Failed to start device flow");
  const codeData = await codeRes.json();
  const { device_code, user_code, verification_uri, interval } = codeData;

  shell.openExternal(verification_uri);

  // Start polling immediately in parallel with the dialog
  const pollPromise = pollForToken(device_code, interval);

  // Show a status window while polling
  let cancelled = false;
  const statusWindow = new BrowserWindow({
    width: 340,
    height: 200,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: "Sign in with GitHub",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  statusWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: center; padding: 24px; background: #1e1e1e; color: #d4d4d4; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 16px 0; color: #fff; }
        .status { font-size: 13px; color: #888; }
        button { margin-top: 16px; padding: 6px 20px; border: 1px solid #444; border-radius: 4px; background: #2d2d2d; color: #d4d4d4; font-size: 12px; cursor: pointer; }
        button:hover { background: #3d3d3d; }
      </style>
    </head>
    <body>
      <div class="status">Enter this code in your browser</div>
      <div class="code">${user_code}</div>
      <div class="status">Waiting for authorization...</div>
    </body>
    </html>
  `)}`);

  statusWindow.on("closed", () => {
    cancelled = true;
    cancelDeviceFlow();
  });

  try {
    const token = await pollPromise;
    if (cancelled) return null;
    return token;
  } finally {
    if (!statusWindow.isDestroyed()) statusWindow.close();
  }
}

async function pollForToken(deviceCode, interval) {
  pollAbortController = new AbortController();
  const { signal } = pollAbortController;
  const startTime = Date.now();
  let pollInterval = (interval || 5) * 1000;

  while (!signal.aborted) {
    if (Date.now() - startTime > MAX_POLL_MS) {
      throw new Error("Sign-in timed out");
    }

    await new Promise((r) => setTimeout(r, pollInterval));
    if (signal.aborted) return null;

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal,
    });

    const data = await res.json();

    if (data.access_token) {
      pollAbortController = null;
      return data.access_token;
    }

    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      pollInterval += 5000;
      continue;
    }
    if (data.error === "expired_token") throw new Error("Code expired, try again");
    if (data.error === "access_denied") throw new Error("Authorization denied");
    throw new Error(data.error_description || data.error || "Unknown error");
  }

  return null;
}

export async function validateToken(oauthToken) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const user = await res.json();
  return user.login;
}
