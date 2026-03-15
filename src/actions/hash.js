import { clipboard } from "electron";
import crypto from "crypto";
import CryptoJS from "crypto-js";

export const md5 = () => {
  clipboard.writeText(CryptoJS.MD5(clipboard.readText()).toString());
};

export const sha1 = () => {
  clipboard.writeText(
    crypto.createHash("sha1").update(clipboard.readText()).digest("hex"),
  );
};
