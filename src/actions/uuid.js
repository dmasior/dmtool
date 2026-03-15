import { clipboard, dialog } from "electron";
import { v1, v4, v6, v7, version } from "uuid";

export const newV1 = () => {
  clipboard.writeText(v1());
};

export const newV4 = () => {
  clipboard.writeText(v4());
};

export const newV6 = () => {
  clipboard.writeText(v6());
};

export const newV7 = () => {
  clipboard.writeText(v7());
};

export const detect = () => {
  const text = clipboard.readText().trim();
  try {
    const ver = version(text);
    dialog.showMessageBoxSync({
      type: "info",
      title: "UUID version",
      message: `${text}\n\nVersion: ${ver}`,
    });
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
};
