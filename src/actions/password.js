import { BrowserWindow, clipboard, dialog, ipcMain } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  generatePassword,
  validatePasswordLength,
  MIN_LENGTH,
  MAX_LENGTH,
  DEFAULT_LENGTH,
} from "./password.pure.js";

const windowFile = fileURLToPath(new URL("../password/password-length.html", import.meta.url));
const preloadFile = fileURLToPath(new URL("../password/preload.js", import.meta.url));
const windowURL = pathToFileURL(windowFile).href;
let lengthWindow = null;
let symbolMode = false;
let revision = 0;
let handlersRegistered = false;

export function generate(length, withSymbols = false) {
  // Never return or send generated text to a renderer.
  clipboard.writeText(generatePassword(length, withSymbols));
}

function settings() {
  return {
    minLength: MIN_LENGTH,
    maxLength: MAX_LENGTH,
    defaultLength: DEFAULT_LENGTH,
    withSymbols: symbolMode,
    revision,
  };
}

function isTrustedSender(event) {
  return lengthWindow !== null && !lengthWindow.isDestroyed()
    && event.sender === lengthWindow.webContents
    && event.senderFrame === lengthWindow.webContents.mainFrame
    && event.senderFrame?.url === windowURL;
}

function registerIpcHandlers() {
  if (handlersRegistered) return;

  ipcMain.handle("password:settings", (event) => {
    if (!isTrustedSender(event)) return { ok: false, code: "unauthorized" };
    return { ok: true, settings: settings() };
  });

  ipcMain.handle("password:generate", (event, length, expectedRevision) => {
    if (!isTrustedSender(event)) return { ok: false, code: "unauthorized" };
    try {
      validatePasswordLength(length);
    } catch {
      return { ok: false, code: "invalid-length" };
    }
    if (expectedRevision !== revision) {
      return { ok: false, code: "mode-changed", settings: settings() };
    }

    const window = lengthWindow;
    try {
      generate(length, symbolMode);
    } catch {
      // Do not expose exception text: errors must never contain a password.
      return { ok: false, code: "generation-failed" };
    }
    window.close();
    return { ok: true };
  });

  ipcMain.handle("password:close", (event) => {
    if (!isTrustedSender(event)) return { ok: false, code: "unauthorized" };
    lengthWindow.close();
    return { ok: true };
  });
  handlersRegistered = true;
}

export function customLength(withSymbols = false) {
  if (typeof withSymbols !== "boolean") {
    throw new TypeError("withSymbols must be a boolean.");
  }
  registerIpcHandlers();
  symbolMode = withSymbols;
  revision += 1;

  if (lengthWindow && !lengthWindow.isDestroyed()) {
    lengthWindow.webContents.send("password:settings-changed", settings());
    if (lengthWindow.isMinimized()) lengthWindow.restore();
    lengthWindow.show();
    lengthWindow.focus();
    return;
  }

  const window = new BrowserWindow({
    width: 400,
    height: 260,
    useContentSize: true,
    backgroundColor: "#1e1e1e",
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    show: false,
    title: "Custom password",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadFile,
    },
  });
  lengthWindow = window;
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.on("render-process-gone", () => {
    if (!window.isDestroyed()) window.destroy();
  });
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "Escape") {
      event.preventDefault();
      window.close();
    }
  });
  window.once("ready-to-show", () => {
    if (!window.isDestroyed()) {
      window.show();
      window.focus();
    }
  });
  window.on("closed", () => {
    if (lengthWindow === window) {
      lengthWindow = null;
      symbolMode = false;
    }
  });
  void window.loadFile(windowFile).catch(() => {
    // Closing during load may reject loadFile; cancellation is not an error.
    if (window.isDestroyed() || lengthWindow !== window) return;
    window.destroy();
    dialog.showErrorBox("Password", "Could not open the password length window.");
  });
}
