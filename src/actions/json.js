const {clipboard, dialog} = require("electron");

exports.validate = () => {
  try {
    JSON.parse(clipboard.readText());
    dialog.showMessageBoxSync({
      type: "info",
      title: "JSON",
      message: "Valid JSON",
    });
  } catch (e) {
    dialog.showMessageBoxSync({
      type: "info",
      title: "JSON",
      message: "Not valid JSON",
    });
  }
}

exports.beautifyTwoSpaces = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(JSON.stringify(data, null, 2));
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
}

exports.beautifyTabs = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(JSON.stringify(data, null, "\t"));
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
}

exports.minify = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(JSON.stringify(data));
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
}

exports.escape = () => {
  try {
    const data = clipboard.readText();
    clipboard.writeText(JSON.stringify(data));
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
}

exports.unescape = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(data);
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
}
