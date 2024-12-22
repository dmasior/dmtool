const {clipboard, dialog} = require("electron");

exports.asc = () => {
  const text = clipboard.readText();
  const sortedText = text.split("\n").sort().join("\n");
  clipboard.writeText(sortedText);
}

exports.desc = () => {
  const text = clipboard.readText();
  const sortedText = text.split("\n").sort().reverse().join("\n");
  clipboard.writeText(sortedText);
}

exports.reverse = () => {
  const text = clipboard.readText();
  const reversedText = text.split("\n").reverse().join("\n");
  clipboard.writeText(reversedText);
}

exports.count = () => {
  const text = clipboard.readText();
  const lines = text.split("\n");
  const count = lines.length;
  dialog.showMessageBox({message: `Number of lines: ${count}`});
}

exports.trim = () => {
  const text = clipboard.readText();
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  clipboard.writeText(lines.join("\n"));
}

exports.removeEmpty = () => {
  const text = clipboard.readText();
  const nonEmptyLines = text.split("\n").filter(line => line.trim() !== "");
  clipboard.writeText(nonEmptyLines.join("\n"));
}

exports.removeDuplicates = () => {
  const text = clipboard.readText();
  const uniqueLines = [...new Set(text.split("\n"))];
  clipboard.writeText(uniqueLines.join("\n"));
}
