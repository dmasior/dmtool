import { clipboard, dialog } from "electron";
import * as pure from "./json.pure.js";

const clipboardTransform = async (fn) => {
  try {
    const text = await clipboard.readText();
    await clipboard.writeText(fn(text));
  } catch (e) {
    dialog.showErrorBox("Error", e.message);
  }
};

export const validate = async () => {
  const result = pure.validate(await clipboard.readText());
  dialog.showMessageBoxSync({
    type: "info",
    title: "JSON",
    message: result.valid ? "Valid JSON" : `Not valid JSON\n\n${result.error}`,
  });
};

export const beautifyTwoSpaces = () =>
  clipboardTransform(pure.beautifyTwoSpaces);
export const beautifyTabs = () => clipboardTransform(pure.beautifyTabs);
export const minify = () => clipboardTransform(pure.minify);
export const escape = () => clipboardTransform(pure.escape);
export const unescape = () => clipboardTransform(pure.unescape);
