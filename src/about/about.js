import { BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let aboutWindow = null;

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 200,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: "About",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  aboutWindow.loadFile(path.join(__dirname, "about.html"));
}

export default createAboutWindow;
