const { clipboard } = require("electron");
const htmlEntities = require("html-entities");

exports.hexDecode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText(), "hex").toString(),
  );
}

exports.hexEncode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText()).toString("hex"),
  );
}

exports.base64Encode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText()).toString("base64"),
  );
}

exports.base64Decode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText(), "base64").toString()
  );
}

exports.htmlEntities = () => {
  clipboard.writeText(
    htmlEntities.encode(clipboard.readText()),
  );
}

exports.htmlEntitiesDecode = () => {
  clipboard.writeText(
    htmlEntities.decode(clipboard.readText()),
  );
}

exports.urlDecode = () => {
  clipboard.writeText(decodeURIComponent(clipboard.readText()));
}

exports.urlEncode = () => {
  clipboard.writeText(encodeURIComponent(clipboard.readText()));
}
