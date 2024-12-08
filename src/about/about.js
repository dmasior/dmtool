const {BrowserWindow} = require('electron');
const path = require('path');

let aboutWindow = null;

const createAboutWindow = () => {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 200,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: 'About',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  aboutWindow.loadFile(path.join(__dirname, 'about.html'));
}

module.exports = createAboutWindow;
