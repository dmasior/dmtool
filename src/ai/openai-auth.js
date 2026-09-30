import { app, BrowserWindow, shell } from "electron";
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from "node:fs";
import path from "node:path";
import { startOpenAiDeviceFlow, refreshOpenAiSession } from "./openai.js";

const FILE = path.join(app.getPath("home"), ".dmtool", "openai-auth.json");
let session = null;
let generation = 0;
let refreshPromise = null;
let loginController = null;

function save(next) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(next), { encoding: "utf-8", mode: 0o600 });
  chmodSync(FILE, 0o600);
  session = next;
}

export function loadOpenAiSession() {
  if (!existsSync(FILE)) return null;
  try {
    session = JSON.parse(readFileSync(FILE, "utf-8"));
    if (!session.accessToken || !session.refreshToken) session = null;
  } catch { session = null; }
  return session;
}

export function deleteOpenAiSession() {
  generation += 1;
  loginController?.abort();
  session = null;
  refreshPromise = null;
  if (existsSync(FILE)) unlinkSync(FILE);
}

export async function getOpenAiSession() {
  if (!session) throw new Error("Please sign in with OpenAI");
  if (session.expiresAt > Date.now() + 60000) return session;
  if (!refreshPromise) {
    const currentGeneration = generation;
    const pending = refreshOpenAiSession(session).then((next) => {
      if (generation !== currentGeneration) throw new Error("OpenAI session changed");
      save(next);
      return next;
    }).finally(() => { if (refreshPromise === pending) refreshPromise = null; });
    refreshPromise = pending;
  }
  return refreshPromise;
}

export async function signInOpenAi() {
  if (loginController) return null;
  const controller = new AbortController();
  loginController = controller;
  const currentGeneration = generation;
  let window;
  const timeout = setTimeout(() => controller.abort(new Error("OpenAI sign-in timed out")), 15 * 60 * 1000);
  try {
    const next = await startOpenAiDeviceFlow({
      signal: controller.signal,
      onCode: async (code, url) => {
        window = new BrowserWindow({ width: 380, height: 240, resizable: false, alwaysOnTop: true,
          title: "Sign in with OpenAI", webPreferences: { contextIsolation: true, nodeIntegration: false } });
        const escaped = code.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
        await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><body style="font-family:system-ui;text-align:center;padding:24px;background:#1e1e1e;color:#ddd"><p>Enter this code in your browser</p><h1>${escaped}</h1><p>Waiting for OpenAI authorization…</p><p>Close this window to cancel.</p></body></html>`)}`);
        window.on("closed", () => controller.abort());
        await shell.openExternal(url);
      },
    });
    if (controller.signal.aborted || currentGeneration !== generation) return null;
    generation += 1;
    save(next);
    return next;
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason?.name === "AbortError") return null;
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timeout);
    if (window && !window.isDestroyed()) window.close();
    loginController = null;
  }
}
