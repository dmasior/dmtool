// Electron sandboxed preloads use CommonJS, even in an ESM application.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("passwordAPI", {
  getSettings: () => ipcRenderer.invoke("password:settings"),
  generateAndCopy: (length, revision) => ipcRenderer.invoke("password:generate", length, revision),
  close: () => ipcRenderer.invoke("password:close"),
  onSettingsChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on("password:settings-changed", listener);
    return () => ipcRenderer.removeListener("password:settings-changed", listener);
  },
});
