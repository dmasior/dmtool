import { clipboard } from "electron";

export const asc = async () => {
  const text = await clipboard.readText();
  const sortedText = text.split("\n").sort().join("\n");
  await clipboard.writeText(sortedText);
};

export const desc = async () => {
  const text = await clipboard.readText();
  const sortedText = text.split("\n").sort().reverse().join("\n");
  await clipboard.writeText(sortedText);
};
