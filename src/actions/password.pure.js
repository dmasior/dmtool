import { randomInt } from "node:crypto";

export const MIN_LENGTH = 1;
export const MAX_LENGTH = 128;
export const DEFAULT_LENGTH = 16;
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
export const DIGITS = "0123456789";
export const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

export function validatePasswordLength(length) {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(`Password length must be an integer from ${MIN_LENGTH} to ${MAX_LENGTH}.`);
  }
}

export function generatePassword(length, withSymbols = false) {
  validatePasswordLength(length);
  if (typeof withSymbols !== "boolean") {
    throw new TypeError("withSymbols must be a boolean.");
  }

  const classes = [UPPERCASE, LOWERCASE, DIGITS];
  if (withSymbols) classes.push(SYMBOLS);
  const alphabet = classes.join("");

  // Reject entire candidates: all valid strings remain equally likely, with
  // no fixed positions for required character classes. Short passwords use
  // the full alphabet without requiring more classes than characters.
  while (true) {
    let password = "";
    let seenClasses = 0;
    for (let index = 0; index < length; index += 1) {
      const character = alphabet[randomInt(alphabet.length)];
      password += character;
      seenClasses |= 1 << classes.findIndex((characters) => characters.includes(character));
    }
    if (length < classes.length || seenClasses === (1 << classes.length) - 1) return password;
  }
}
