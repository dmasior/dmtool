const { clipboard } = require("electron");

exports.base64Decode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText(), "base64").toString(),
  );
}

exports.base64Encode = () => {
  clipboard.writeText(
    Buffer.from(clipboard.readText()).toString("base64"),
  );
}

exports.urlDecode = () => {
  clipboard.writeText(decodeURIComponent(clipboard.readText()));
}

exports.urlEncode = () => {
  clipboard.writeText(encodeURIComponent(clipboard.readText()));
}
