import { clipboard } from "electron";

export const basic = () => {
  clipboard.writeText(clipboard.readText().trim());
};
