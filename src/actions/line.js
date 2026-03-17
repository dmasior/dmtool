import { clipboard } from "electron";

export const asc = () => {
  const text = clipboard.readText();
  const sortedText = text.split("\n").sort().join("\n");
  clipboard.writeText(sortedText);
};

export const desc = () => {
  const text = clipboard.readText();
  const sortedText = text.split("\n").sort().reverse().join("\n");
  clipboard.writeText(sortedText);
};
