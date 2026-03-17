import { BrowserWindow, ipcMain, clipboard } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { chatCompletion } from "./copilot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let promptWindow = null;
let clipboardText = "";
let currentOAuthToken = null;
let currentModel = null;

export function openPromptWindow(oauthToken, model) {
  if (promptWindow) {
    promptWindow.focus();
    return;
  }

  currentOAuthToken = oauthToken;
  currentModel = model;

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
    clipboardText = clipboard.readText() || "";
    promptWindow.webContents.send("ai:clipboard-context", clipboardText);
    promptWindow.webContents.send("ai:model-info", currentModel);
  });

  promptWindow.on("closed", () => {
    promptWindow = null;
    clipboardText = "";
    currentOAuthToken = null;
    currentModel = null;
  });
}

const systemMessage = {
  role: "system",
  content:
    "You are a helpful assistant. Respond with plain text only — no markdown formatting, no code fences, no extra wrapping. Be concise and direct. The user message includes their current clipboard content as context. Respond with content ready to be copied and used directly.",
};

function registerIpcHandlers() {
  ipcMain.handle("ai:send-prompt", async (_event, text) => {
    const userContent = clipboardText
      ? `Clipboard context:\n\n${clipboardText}\n\n---\n\n${text}`
      : text;

    const messages = [
      systemMessage,
      { role: "user", content: userContent },
    ];

    try {
      const response = await chatCompletion(
        currentOAuthToken,
        currentModel,
        messages
      );
      if (promptWindow) {
        promptWindow.webContents.send("ai:response", response);
      }
    } catch (err) {
      if (promptWindow) {
        promptWindow.webContents.send("ai:error", err.message);
      }
    }
  });

  ipcMain.handle("ai:copy-to-clipboard", (_event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle("ai:close-window", () => {
    if (promptWindow) promptWindow.close();
  });
}

registerIpcHandlers();
