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
      label: "Encode",
      submenu: [
        {
          label: "Hex",
          click: () => actions.encDec.hexEncode(),
        },
        {
          label: "Base64",
          click: () => actions.encDec.base64Encode(),
        },
        {type: "separator"},
        {
          label: "HTML Entities",
          click: () => actions.encDec.htmlEntities(),
        },
        {type: "separator"},
        {
          label: "URL Encode",
          click: () => actions.encDec.urlEncode(),
        },
      ],
    },
    {
      label: "Decode",
      submenu: [
        {
          label: "Hex",
          click: () => actions.encDec.hexDecode(),
        },
        {
          label: "Base64",
          click: () => actions.encDec.base64Decode(),
        },
        {type: "separator"},
        {
          label: "HTML Entities",
          click: () => actions.encDec.htmlEntitiesDecode(),
        },
        {type: "separator"},
        {
          label: "URL Decode",
          click: () => actions.encDec.urlDecode(),
        },
      ],
    },
    {type: "separator"},
    {
      label: "JSON",
      submenu: [
        {type: "separator"},
        {
          label: "Beautify (2 spaces)",
          click: () => actions.json.beautifyTwoSpaces(),
        },
        {
          label: "Beautify (tabs)",
          click: () => actions.json.beautifyTabs(),
        },
        {
          label: "Minify",
          click: () => actions.json.minify(),
        },
        {type: "separator"},
        {
          label: "Escape",
          click: () => actions.json.escape(),
        },
        {
          label: "Unescape",
          click: () => actions.json.unescape(),
        },
        {type: "separator"},
        {
          label: "Validate",
          click: () => actions.json.validate(),
        },
      ],
    },
    {type: "separator"},
    {
      label: "Trim",
      click: () => actions.trim.basic(),
    },
    {
      label: "Slug",
      submenu: [
        {
          label: "Replacement: dash (-)",
          click: () => actions.slug.slugify("-"),
        },
        {
          label: "Replacement: underscore (_)",
          click: () => actions.slug.slugify("_"),
        },
      ]
    },
    {
      label: "Case",
      submenu: [
        {
          label: "lowercase",
          click: () => actions.case.lowercase(),
        },
        {
          label: "UPPERCASE",
          click: () => actions.case.uppercase(),
        },
        {
          label: "Capitalize first word",
          click: () => actions.case.sentenceCase(),
        },
        {
          label: "Capitalize each word",
          click: () => actions.case.capitalize(),
        },
        {
          label: "CamelCase",
          click: () => actions.case.camelCase(),
        },
        {
          label: "snake_case",
          click: () => actions.case.snakeCase(),
        },
        {
          label: "kebab-case",
          click: () => actions.case.kebabCase(),
        }
      ]
    },
    {
      label: "Line",
      submenu: [
        {
          label: "Sort ascending",
          click: () => actions.line.asc(),
        },
        {
          label: "Sort descending",
          click: () => actions.line.desc(),
        },
        {type: "separator"},
        {
          label: "Trim",
          click: () => actions.line.trim(),
        },
        {
          label: "Reverse",
          click: () => actions.line.reverse(),
        },
        {
          label: "Count",
          click: () => actions.line.count(),
        },
        {type: "separator"},
        {
          label: "Remove empty",
          click: () => actions.line.removeEmpty(),
        },
        {
          label: "Remove duplicates",
          click: () => actions.line.removeDuplicates(),
        }
      ]
    },
    {type: "separator"},
    {
      label: "UUID",
      submenu: [
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
      label: "Hash",
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
          label: "SHA3-256",
          click: () => actions.hash.sha3(256),
        },
        {
          label: "SHA3-384",
          click: () => actions.hash.sha3(384),
        },
        {
          label: "SHA3-512",
          click: () => actions.hash.sha3(512),
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

// Override default behavior of closing all windows when the last one is closed, so the app will continue running in the tray
app.on("window-all-closed", () => {});
