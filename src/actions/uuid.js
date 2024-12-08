const { clipboard, Notification } = require("electron");
const uuid = require("uuid");

exports.newV1 = () => {
  clipboard.writeText(uuid.v1());
}

exports.newV4 = () => {
  clipboard.writeText(uuid.v4());
}

exports.newV6 = () => {
  clipboard.writeText(uuid.v6());
}

exports.newV7 = () => {
  clipboard.writeText(uuid.v7());
}

exports.V1ToV6 = () => {
  const text = clipboard.readText().trim();
  try {
    clipboard.writeText(uuid.v1ToV6(text));
  } catch (e) {
    new Notification({ title: "Error", body: e.message }).show();
  }
}

exports.V6ToV1 = () => {
  const text = clipboard.readText().trim();
  try {
    clipboard.writeText(uuid.v6ToV1(text));
  } catch (e) {
    new Notification({ title: "Error", body: e.message }).show();
  }
}

exports.detect = () => {
  const text = clipboard.readText().trim();
  try {
    clipboard.writeText(`${text} | UUID VERSION: ${uuid.version(text)}`);
  } catch (e) {
    new Notification({ title: "Error", body: e.message }).show();
  }
}

exports.validate = () => {
  const text = clipboard.readText().trim();
  try {
    clipboard.writeText(`${text} | UUID VALID: ${uuid.validate(text)}`);
  } catch (e) {
    new Notification({ title: "Error", body: e.message }).show();
  }
}
