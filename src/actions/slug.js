const { clipboard } = require("electron");
const slugify = require("slugify");

exports.slugify = (replacement) => {
  const text = clipboard.readText().trim();
  clipboard.writeText(slugify(text, { replacement }));
}
