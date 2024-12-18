const {updateElectronApp} = require('update-electron-app')
updateElectronApp();

const {app, Tray, Menu} = require("electron");
const path = require("path");

const createAboutWindow = require("./src/about/about");
const actions = require("./src/actions/actions");

let tray = null;

app.whenReady().then(() => {
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = 'assets/icons/tray/windows-icon.ico';
  } else if (process.platform === 'darwin') {
    app.dock.hide();
    iconPath = 'assets/icons/tray/mac-icon.png';
  } else {
    iconPath = 'assets/icons/tray/linux-icon.png';
  }

  tray = new Tray(path.join(__dirname, iconPath));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Base64 Encode",
      click: () => actions.encDec.base64Encode(),
    },
    {
      label: "Base64 Decode",
      click: () => actions.encDec.base64Decode(),
    },
    {type: "separator"},
    {
      label: "URL Encode",
      click: () => actions.encDec.urlEncode(),
    },
    {
      label: "URL Decode",
      click: () => actions.encDec.urlDecode(),
    },
    {type: "separator"},
    {
      label: "JSON",
      submenu: [
        {
          label: "Beautify",
          click: () => actions.json.beautify(),
        },
        {
          label: "Minify",
          click: () => actions.json.minify(),
        },
        {
          label: "Encode",
          click: () => actions.json.encode(),
        },
        {
          label: "Decode",
          click: () => actions.json.decode(),
        },
      ],
    },
    {type: "separator"},
    {
      label: "Sort ASC",
      click: () => actions.sort.asc(),
    },
    {
      label: "Sort DESC",
      click: () => actions.sort.desc(),
    },
    {type: "separator"},
    {
      label: "Trim",
      submenu: [
        {
          label: "Beginning and ending",
          click: () => actions.trim.basic(),
        },
        {
          label: "Beginning and ending of each line",
          click: () => actions.trim.lines(),
        }
      ],
    },
    {type: "separator"},
    {
      label: "UUID",
      submenu: [
        {
          label: "Validate",
          click: () => actions.uuid.validate(),
        },
        {
          label: "Detect version",
          click: () => actions.uuid.detect(),
        },
        {type: "separator"},
        {
          label: "New V1",
          click: () => actions.uuid.newV1(),
        },
        {
          label: "New V4",
          click: () => actions.uuid.newV4(),
        },
        {
          label: "New V6",
          click: () => actions.uuid.newV6(),
        },
        {
          label: "New V7",
          click: () => actions.uuid.newV7(),
        },
        {type: "separator"},
        {
          label: "Convert V1 to V6",
          click: () => actions.uuid.V1ToV6(),
        },
        {
          label: "Convert V6 to V1",
          click: () => actions.uuid.V6ToV1(),
        },
      ],
    },
    {type: "separator"},
    {
      label: "Hashing",
      submenu: [
        {
          label: "MD5",
          click: () => actions.hash.md5(),
        },
        {
          label: "SHA1",
          click: () => actions.hash.sha1(),
        },
        {
          label: "SHA256",
          click: () => actions.hash.sha256(),
        },
        {
          label: "SHA384",
          click: () => actions.hash.sha384(),
        },
        {
          label: "SHA512",
          click: () => actions.hash.sha512(),
        },
        {
          label: "SHA3",
          click: () => actions.hash.sha3(),
        },
        {
          label: "Blake",
          click: () => actions.hash.blake(),
        },
      ],
    },
    {type: "separator"},
    {
      label: "About",
      click: () => createAboutWindow(),
    },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip("DMTool");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
