import { clipboard } from "electron";

export const basic = async () => {
  await clipboard.writeText((await clipboard.readText()).trim());
};
