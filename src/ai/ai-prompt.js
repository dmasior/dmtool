import { BrowserWindow, ipcMain, clipboard } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let promptWindow = null;
let clipboardText = "";
let currentCompletion = null;
let currentModel = null;
let currentProvider = null;

export async function openPromptWindow(model, provider, completion) {
  clipboardText = (await clipboard.readText()) || "";
  if (promptWindow) {
    promptWindow.webContents.send("ai:clipboard-context", clipboardText);
    promptWindow.focus();
    return;
  }

  currentCompletion = completion;
  currentModel = model;
  currentProvider = provider;

  promptWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: true,
    fullscreenable: false,
    minimizable: false,
    alwaysOnTop: true,
    title: "Query AI",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  promptWindow.loadFile(path.join(__dirname, "ai-prompt.html"));

  promptWindow.webContents.once("did-finish-load", () => {
    promptWindow.webContents.send("ai:clipboard-context", clipboardText);
    promptWindow.webContents.send("ai:model-info", `${currentProvider} · ${currentModel}`);
  });

  promptWindow.on("closed", () => {
    promptWindow = null;
    clipboardText = "";
    currentCompletion = null;
    currentModel = null;
    currentProvider = null;
  });
}

const systemMessage = {
  role: "system",
  content:
    "You are a helpful assistant. Respond with plain text only — no markdown formatting, no code fences, no extra wrapping. Be concise and direct. The user message includes their current clipboard content as context. Respond with content ready to be copied and used directly.",
};

function registerIpcHandlers() {
  ipcMain.handle("ai:send-prompt", async (_event, text) => {
    const window = promptWindow;
    const completion = currentCompletion;
    if (!window || _event.sender !== window.webContents || !completion) return;
    const userContent = clipboardText
      ? `Clipboard context:\n\n${clipboardText}\n\n---\n\n${text}`
      : text;

    const messages = [
      systemMessage,
      { role: "user", content: userContent },
    ];

    try {
      const response = await completion(messages);
      if (!window.isDestroyed()) {
        window.webContents.send("ai:response", response);
      }
    } catch (err) {
      if (!window.isDestroyed()) {
        window.webContents.send("ai:error", err.message);
      }
    }
  });

  ipcMain.handle("ai:copy-to-clipboard", (_event, text) => {
    return clipboard.writeText(text);
  });

  ipcMain.handle("ai:close-window", () => {
    if (promptWindow) promptWindow.close();
  });
}

registerIpcHandlers();
