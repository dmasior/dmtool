const {clipboard} = require("electron");

exports.basic = () => {
  clipboard.writeText(clipboard.readText().trim());
}

exports.lines = () => {
  const text = clipboard.readText();
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  clipboard.writeText(lines.join("\n"));
}
