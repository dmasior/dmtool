import { clipboard, dialog } from "electron";
import { app } from "electron";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const DMTOOL_DIR = path.join(app.getPath("home"), ".dmtool");
const PLUGINS_DIR = path.join(DMTOOL_DIR, "plugins");
const ERROR_LOG = path.join(DMTOOL_DIR, "dmtool.log");

function logError(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(ERROR_LOG, line, "utf-8");
}

function ensurePluginsDir() {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });

  const pkgPath = path.join(PLUGINS_DIR, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, '{"type":"module"}\n', "utf-8");
  }
}

function loadEnvFile() {
  const envPath = path.join(DMTOOL_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function loadPlugins() {
  ensurePluginsDir();
  loadEnvFile();

  const files = fs.readdirSync(PLUGINS_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const plugins = [];

  for (const file of files) {
    const filePath = path.join(PLUGINS_DIR, file);
    try {
      const mod = await import(pathToFileURL(filePath).href);
      const plugin = mod.default;

      if (!plugin?.name || !Array.isArray(plugin?.actions)) {
        logError(`Plugin ${file}: must export default { name, actions[] }`);
        continue;
      }

      plugins.push({ ...plugin, file });
    } catch (err) {
      logError(`Plugin ${file} failed to load: ${err.message}`);
    }
  }

  return plugins;
}

function buildPluginMenuItems(plugins) {
  if (plugins.length === 0) {
    return [{ label: "No plugins found", enabled: false }];
  }

  return plugins.map((plugin) => ({
    label: plugin.name,
    submenu: buildActionItems(plugin.actions, plugin.file),
  }));
}

function buildActionItems(actions, file) {
  return actions.map((action) => {
    if (action.submenu) {
      return {
        label: action.label,
        submenu: buildActionItems(action.submenu, file),
      };
    }
    return {
      label: action.label,
      click: () => executeAction(action, file),
    };
  });
}

async function executeAction(action, file) {
  try {
    const result = await action.fn(clipboard.readText());
    if (typeof result === "string") {
      clipboard.writeText(result);
    }
  } catch (err) {
    dialog.showErrorBox("Plugin error", `${file}: ${err.message}`);
  }
}

export { loadPlugins, buildPluginMenuItems };
