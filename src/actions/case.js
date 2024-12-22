const { clipboard } = require("electron");

exports.lowercase = () => {
  const text = clipboard.readText();
  clipboard.writeText(text.toLowerCase());
}

exports.uppercase = () => {
  const text = clipboard.readText();
  clipboard.writeText(text.toUpperCase());
}

exports.capitalize = () => {
  const text = clipboard.readText().toLowerCase();
  clipboard.writeText(text.replace(/\b\w/g, char => char.toUpperCase()));
}

exports.sentenceCase = () => {
  const text = clipboard.readText().toLowerCase();
  clipboard.writeText(text.replace(/(^\w|\.\s+\w)/g, char => char.toUpperCase()));
}

exports.camelCase = () => {
  const text = clipboard.readText();
  clipboard.writeText(text.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  }));
}

exports.snakeCase = () => {
  const text = clipboard.readText();
  clipboard.writeText(text.replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_'));
}

exports.kebabCase = () => {
  const text = clipboard.readText();
  clipboard.writeText(text.replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, '-')
    .toLowerCase());
}
