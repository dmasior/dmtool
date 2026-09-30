import { updateElectronApp } from "update-electron-app";
updateElectronApp();

import { app, Tray, Menu, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import createAboutWindow from "./src/about/about.js";
import * as actions from "./src/actions/actions.js";
import {
  loadToken,
  saveToken,
  deleteToken,
  startDeviceFlow,
  validateToken,
} from "./src/ai/github-auth.js";
import { fetchModels, clearCopilotToken, chatCompletion } from "./src/ai/copilot.js";
import { openPromptWindow } from "./src/ai/ai-prompt.js";
import { loadPlugins, buildPluginMenuItems } from "./src/plugins/plugins.js";
import { buildMenuTemplate } from "./src/menu/menu.js";
import { createModelRefresh } from "./src/ai/model-refresh.js";
import { loadOpenAiSession, getOpenAiSession, signInOpenAi, deleteOpenAiSession } from "./src/ai/openai-auth.js";
import { fetchOpenAiModels, openAiCompletion } from "./src/ai/openai.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray = null;
let plugins = [];

let isSignedIn = false;
let username = null;
let oauthToken = null;
let models = [];
let selectedModel = null;
let sessionGeneration = 0;
const settingsFile = path.join(app.getPath("home"), ".dmtool", "ai-settings.json");
let settings = {};
try { settings = JSON.parse(readFileSync(settingsFile, "utf-8")) || {}; } catch {}
let provider = settings.provider === "openai" ? "openai" : "copilot";
let openAiSession = null;
let openAiModels = [];
let openAiModel = null;
let openAiGeneration = 0;

function saveSettings() {
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  writeFileSync(settingsFile, JSON.stringify(settings), "utf-8");
}

const openAiRefresh = createModelRefresh({
  fetchModels: async () => fetchOpenAiModels(await getOpenAiSession()),
  getSession: () => ({ token: openAiSession?.refreshToken, generation: openAiGeneration }),
  onSuccess: (nextModels) => {
    openAiModels = nextModels;
    openAiModel = nextModels.find((model) => model.id === (openAiModel?.id || settings.openAiModel)) || nextModels[0] || null;
    settings.openAiModel = openAiModel?.id || null;
    saveSettings();
    rebuildMenu();
  },
});

async function handleSelectProvider(next) {
  provider = next;
  settings.provider = next;
  saveSettings();
  rebuildMenu();
  if (next === "openai" && openAiSession && !openAiModels.length) await openAiRefresh.refresh();
}

async function handleOpenAiSignIn() {
  const next = await signInOpenAi();
  if (!next) return;
  openAiGeneration += 1;
  openAiRefresh.invalidate();
  openAiSession = next;
  openAiModels = [];
  openAiModel = null;
  rebuildMenu();
  await openAiRefresh.refresh();
}

function handleOpenAiSignOut() {
  openAiGeneration += 1;
  openAiRefresh.invalidate();
  deleteOpenAiSession();
  openAiSession = null;
  openAiModels = [];
  openAiModel = null;
  rebuildMenu();
}

const modelRefresh = createModelRefresh({
  fetchModels,
  getSession: () => ({ token: isSignedIn ? oauthToken : null, generation: sessionGeneration }),
  onSuccess: (nextModels, token) => {
    const stored = loadToken();
    const preferred = selectedModel ?? (stored?.oauthToken === token ? stored.selectedModel : null);
    const nextSelectedModel = nextModels.find((model) => model.id === preferred?.id) || nextModels[0] || null;
    saveToken(token, nextSelectedModel);
    models = nextModels;
    selectedModel = nextSelectedModel;
    rebuildMenu();
  },
});

function beginSession(token, user) {
  sessionGeneration += 1;
  modelRefresh.invalidate();
  clearCopilotToken();
  oauthToken = token;
  username = user;
  isSignedIn = true;
  models = [];
  selectedModel = null;
  rebuildMenu();
}

function rebuildMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate(buildMenuTemplate({
    actions,
    pluginMenuItems: buildPluginMenuItems(plugins),
    ai: {
      provider,
      providers: [{ id: "copilot", name: "GitHub Copilot" }, { id: "openai", name: "OpenAI (ChatGPT)" }],
      ...(provider === "openai"
        ? { isSignedIn: Boolean(openAiSession), username: openAiSession?.username, models: openAiModels, selectedModel: openAiModel }
        : { isSignedIn, username, models, selectedModel }),
    },
    callbacks: {
      onSelectProvider: handleSelectProvider,
      onSignIn: provider === "openai" ? handleOpenAiSignIn : handleSignIn,
      onSignOut: provider === "openai" ? handleOpenAiSignOut : handleSignOut,
      onRefreshModels: provider === "openai" ? () => openAiRefresh.refresh() : handleRefreshModels,
      onSelectModel: provider === "openai" ? (model) => {
        openAiModel = model;
        settings.openAiModel = model.id;
        saveSettings();
        rebuildMenu();
      } : handleSelectModel,
      onAskAi: provider === "openai"
        ? (model) => {
          const generation = openAiGeneration;
          return openPromptWindow(model.id, "OpenAI", async (messages) => {
            if (generation !== openAiGeneration) throw new Error("OpenAI session changed — reopen Ask AI");
            const session = await getOpenAiSession();
            if (generation !== openAiGeneration) throw new Error("OpenAI session changed — reopen Ask AI");
            return openAiCompletion(session, model.id, messages);
          });
        }
        : (model) => {
          const token = oauthToken;
          const generation = sessionGeneration;
          return openPromptWindow(model.id, "GitHub Copilot", (messages) => {
            if (generation !== sessionGeneration) throw new Error("GitHub session changed — reopen Ask AI");
            return chatCompletion(token, model.id, messages);
          });
        },
      onHowToUse: showHowToUse,
      onAbout: () => createAboutWindow(),
      onQuit: () => app.quit(),
      onError: (error) => dialog.showErrorBox("Operation failed", String(error?.message ?? error)),
    },
  }));

  tray.setContextMenu(contextMenu);
}

function handleSelectModel(model) {
  selectedModel = model;
  saveToken(oauthToken, selectedModel);
  rebuildMenu();
}

async function showHowToUse() {
  await dialog.showMessageBox({
    type: "info",
    title: "How to use DMTool",
    message: "Use DMTool from the tray menu",
    detail: [
      "Copy text to the clipboard, open the DMTool menu, choose an operation, then paste the result.",
      "JSON: Validate shows the validation status instead of changing the clipboard.",
      "Password: Choose a character group, then Generate 16 characters or Custom length…. The generated password is copied automatically.",
      "AI: Select GitHub Copilot or OpenAI (ChatGPT), sign in, select a model, then choose Ask AI…. For OpenAI, enter the device code in your browser; your account needs Codex access. Enter a prompt; clipboard text is included as context. Explicitly copy the response before you paste it.",
      "Plugins: Open a plugin name to choose its actions. Restart DMTool after modifying plugins.",
    ].join("\n\n"),
    buttons: ["OK"],
  });
}

async function handleSignIn() {
  const generation = sessionGeneration;
  try {
    const token = await startDeviceFlow();
    if (!token || generation !== sessionGeneration) return;

    const user = await validateToken(token);
    if (generation !== sessionGeneration) return;
    if (!user) {
      dialog.showErrorBox("Sign-in Failed", "Failed to validate GitHub token");
      return;
    }

    beginSession(token, user);
    saveToken(oauthToken, null);

    await handleRefreshModels({ silent: true });
  } catch (err) {
    dialog.showErrorBox("Sign-in Failed", err.message);
  }
}

async function handleRefreshModels({ silent = false } = {}) {
  try {
    await modelRefresh.refresh();
  } catch (err) {
    // Manual refresh errors reach the menu's native error dialog. Keep usable state.
    if (!silent) throw err;
    console.error("Failed to fetch models:", err.message);
  }
}

function handleSignOut() {
  sessionGeneration += 1;
  modelRefresh.invalidate();
  deleteToken();
  clearCopilotToken();
  isSignedIn = false;
  username = null;
  oauthToken = null;
  models = [];
  selectedModel = null;
  rebuildMenu();
}

async function restoreSession() {
  const generation = sessionGeneration;
  const stored = loadToken();
  if (!stored?.oauthToken) return;

  try {
    const user = await validateToken(stored.oauthToken);
    if (generation !== sessionGeneration) return;
    if (!user) {
      deleteToken();
      return;
    }

    beginSession(stored.oauthToken, user);

    await handleRefreshModels({ silent: true });
  } catch (err) {
    console.error("Session restore failed:", err.message);
    // Don't delete token on network errors — keep it for next restart
  }
}

app.whenReady().then(async () => {
  if (process.platform === "darwin") app.dock.hide();

  const trayIcons = {
    win32: "assets/icons/tray/windows-icon.ico",
    darwin: "assets/icons/tray/mac-iconTemplate.png",
    linux: "assets/icons/tray/linux-icon.png",
  };
  const iconPath = trayIcons[process.platform] || trayIcons.linux;

  tray = new Tray(path.join(__dirname, iconPath));
  tray.setToolTip("DMTool");

  plugins = await loadPlugins();
  openAiSession = loadOpenAiSession();
  rebuildMenu();
  if (provider === "openai" && openAiSession) {
    try { await openAiRefresh.refresh(); }
    catch (error) { console.error("OpenAI session restore failed:", error.message); }
  }
  await restoreSession();
});

app.on("window-all-closed", () => {});
