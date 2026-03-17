const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiAPI", {
  sendPrompt: (text) => ipcRenderer.invoke("ai:send-prompt", text),
  onResponse: (callback) =>
    ipcRenderer.on("ai:response", (_event, data) => callback(data)),
  onError: (callback) =>
    ipcRenderer.on("ai:error", (_event, msg) => callback(msg)),
  onClipboardContext: (callback) =>
    ipcRenderer.on("ai:clipboard-context", (_event, text) => callback(text)),
  onModelInfo: (callback) =>
    ipcRenderer.on("ai:model-info", (_event, model) => callback(model)),
  copyToClipboard: (text) => ipcRenderer.invoke("ai:copy-to-clipboard", text),
  close: () => ipcRenderer.invoke("ai:close-window"),
});
