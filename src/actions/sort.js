const {clipboard} = require("electron");

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
