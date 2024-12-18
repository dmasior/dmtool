const {clipboard, Notification} = require("electron");

exports.beautify = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
    new Notification({title: "Error", body: e.message}).show();
  }
}

exports.minify = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    new Notification({title: "Error", body: e.message}).show();
  }
}

exports.encode = () => {
  try {
    const data = clipboard.readText();
    clipboard.writeText(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    new Notification({title: "Error", body: e.message}).show();
  }
}

exports.decode = () => {
  try {
    const data = JSON.parse(clipboard.readText());
    clipboard.writeText(data);
  } catch (e) {
    console.error(e);
    new Notification({title: "Error", body: e.message}).show();
  }
}
