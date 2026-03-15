import { clipboard } from "electron";
import { encode, decode } from "html-entities";

export const base64Encode = () => {
  clipboard.writeText(Buffer.from(clipboard.readText()).toString("base64"));
};

export const base64Decode = () => {
  clipboard.writeText(Buffer.from(clipboard.readText(), "base64").toString());
};

export const htmlEntitiesEncode = () => {
  clipboard.writeText(encode(clipboard.readText()));
};

export const htmlEntitiesDecode = () => {
  clipboard.writeText(decode(clipboard.readText()));
};

export const urlDecode = () => {
  clipboard.writeText(decodeURIComponent(clipboard.readText()));
};

export const urlEncode = () => {
  clipboard.writeText(encodeURIComponent(clipboard.readText()));
};
