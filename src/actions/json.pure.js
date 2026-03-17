export const validate = (text) => {
  try {
    JSON.parse(text);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
};

export const beautifyTwoSpaces = (text) => {
  const data = JSON.parse(text);
  return JSON.stringify(data, null, 2);
};

export const beautifyTabs = (text) => {
  const data = JSON.parse(text);
  return JSON.stringify(data, null, "\t");
};

export const minify = (text) => {
  const data = JSON.parse(text);
  return JSON.stringify(data);
};

export const escape = (text) => {
  return JSON.stringify(text);
};

export const unescape = (text) => {
  const data = JSON.parse(text);
  if (typeof data !== "string") {
    throw new TypeError("Expected a JSON-encoded string");
  }
  return data;
};
