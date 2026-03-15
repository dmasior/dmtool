import { clipboard } from "electron";
import slugify from "slugify";

export const slug = (replacement) => {
  const text = clipboard.readText().trim();
  clipboard.writeText(slugify(text, { replacement }));
};
