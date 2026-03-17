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
import { fetchModels, clearCopilotToken } from "./src/ai/copilot.js";
import { openPromptWindow } from "./src/ai/ai-prompt.js";
import { loadPlugins, buildPluginMenuItems } from "./src/plugins/plugins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray = null;
let plugins = [];

let isSignedIn = false;
let username = null;
let oauthToken = null;
let models = [];
let selectedModel = null;

function rebuildMenu() {
  if (!tray) return;

  const aiSubmenu = buildAiSubmenu();
  const contextMenu = Menu.buildFromTemplate([
    { label: "AI", submenu: aiSubmenu },
    {
      label: "Encoding",
      submenu: [
        { label: "Base64 Encode", click: () => actions.encDec.base64Encode() },
        { label: "Base64 Decode", click: () => actions.encDec.base64Decode() },
        { type: "separator" },
        { label: "URL Encode", click: () => actions.encDec.urlEncode() },
        { label: "URL Decode", click: () => actions.encDec.urlDecode() },
        { type: "separator" },
        { label: "HTML Encode", click: () => actions.encDec.htmlEntitiesEncode() },
        { label: "HTML Decode", click: () => actions.encDec.htmlEntitiesDecode() },
      ],
    },
    {
      label: "JSON",
      submenu: [
        { label: "Validate", click: () => actions.json.validate() },
        { label: "Beautify (2 spaces)", click: () => actions.json.beautifyTwoSpaces() },
        { label: "Beautify (tabs)", click: () => actions.json.beautifyTabs() },
        { label: "Minify", click: () => actions.json.minify() },
        { type: "separator" },
        { label: "Escape", click: () => actions.json.escape() },
        { label: "Unescape", click: () => actions.json.unescape() },
      ],
    },
    {
      label: "Lines",
      submenu: [
        { label: "Sort ASC", click: () => actions.line.asc() },
        { label: "Sort Desc", click: () => actions.line.desc() },
        { type: "separator" },
        { label: "Trim", click: () => actions.trim.basic() },
      ],
    },
    {
      label: "UUID",
      submenu: [
        { label: "Detect", click: () => actions.uuid.detect() },
        {
          label: "Generate",
          submenu: [
            { label: "V1", click: () => actions.uuid.newV1() },
            { label: "V4", click: () => actions.uuid.newV4() },
            { label: "V6", click: () => actions.uuid.newV6() },
            { label: "V7", click: () => actions.uuid.newV7() },
          ],
        },
      ],
    },
    {
      label: "Hash",
      submenu: [
        { label: "MD5", click: () => actions.hash.md5() },
        { label: "SHA1", click: () => actions.hash.sha1() },
      ],
    },
    { type: "separator" },
    {
      label: "Plugins",
      submenu: buildPluginMenuItems(plugins),
    },
    { type: "separator" },
    { label: "About", click: () => createAboutWindow() },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

function buildAiSubmenu() {
  if (!isSignedIn) {
    return [
      {
        label: "Sign in with GitHub",
        click: handleSignIn,
      },
    ];
  }

  const modelItem = models.length > 0
    ? {
        label: `Model: ${selectedModel.name}`,
        submenu: models.map((m) => ({
          label: m.name,
          type: "radio",
          checked: m.id === selectedModel.id,
          click: () => {
            selectedModel = m;
            saveToken(oauthToken, selectedModel);
            rebuildMenu();
          },
        })),
      }
    : { label: "Refresh models", click: handleRefreshModels };

  return [
    {
      label: "Query AI",
      click: () => openPromptWindow(oauthToken, selectedModel.id),
      enabled: models.length > 0,
    },
    { type: "separator" },
    modelItem,
    { type: "separator" },
    { label: `Signed in as ${username}`, enabled: false },
    { label: "Sign out", click: handleSignOut },
  ];
}

async function handleSignIn() {
  try {
    const token = await startDeviceFlow();
    if (!token) return;

    const user = await validateToken(token);
    if (!user) {
      dialog.showErrorBox("Sign-in Failed", "Failed to validate GitHub token");
      return;
    }

    oauthToken = token;
    username = user;
    isSignedIn = true;
    saveToken(oauthToken, null);

    await handleRefreshModels();
  } catch (err) {
    dialog.showErrorBox("Sign-in Failed", err.message);
  }
}

async function handleRefreshModels() {
  try {
    models = await fetchModels(oauthToken);
    if (models.length > 0) {
      const stored = loadToken();
      const preferred = stored?.selectedModel;
      selectedModel =
        preferred && models.find((m) => m.id === preferred.id)
          ? preferred
          : models[0];
      saveToken(oauthToken, selectedModel);
    }
  } catch (err) {
    models = [];
    console.error("Failed to fetch models:", err.message);
  }
  rebuildMenu();
}

function handleSignOut() {
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
  const stored = loadToken();
  if (!stored?.oauthToken) return;

  try {
    const user = await validateToken(stored.oauthToken);
    if (!user) {
      deleteToken();
      return;
    }

    oauthToken = stored.oauthToken;
    username = user;
    isSignedIn = true;

    await handleRefreshModels();
  } catch (err) {
    console.error("Session restore failed:", err.message);
    // Don't delete token on network errors — keep it for next restart
  }
}

app.commandLine.appendSwitch("use-mock-keychain");

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
  rebuildMenu();
  await restoreSession();
});

app.on("window-all-closed", () => {});
