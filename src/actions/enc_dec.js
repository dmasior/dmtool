import { clipboard } from "electron";
import { encode, decode } from "html-entities";

export const base64Encode = async () => {
  await clipboard.writeText(Buffer.from(await clipboard.readText()).toString("base64"));
};

export const base64Decode = async () => {
  await clipboard.writeText(Buffer.from(await clipboard.readText(), "base64").toString());
};

export const htmlEntitiesEncode = async () => {
  await clipboard.writeText(encode(await clipboard.readText()));
};

export const htmlEntitiesDecode = async () => {
  await clipboard.writeText(decode(await clipboard.readText()));
};

export const urlDecode = async () => {
  await clipboard.writeText(decodeURIComponent(await clipboard.readText()));
};

export const urlEncode = async () => {
  await clipboard.writeText(encodeURIComponent(await clipboard.readText()));
};
