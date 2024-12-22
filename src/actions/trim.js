const {clipboard} = require("electron");

exports.basic = () => {
  clipboard.writeText(clipboard.readText().trim());
}
