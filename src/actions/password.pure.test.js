import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  generatePassword,
  validatePasswordLength,
  MIN_LENGTH,
  MAX_LENGTH,
  DEFAULT_LENGTH,
  UPPERCASE,
  LOWERCASE,
  DIGITS,
  SYMBOLS,
} from "./password.pure.js";

describe("password constants", () => {
  it("exports the approved range, default, and exact character sets", () => {
    assert.equal(MIN_LENGTH, 1);
    assert.equal(MAX_LENGTH, 128);
    assert.equal(DEFAULT_LENGTH, 16);
    assert.equal(UPPERCASE, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    assert.equal(LOWERCASE, "abcdefghijklmnopqrstuvwxyz");
    assert.equal(DIGITS, "0123456789");
    assert.equal(SYMBOLS, "!@#$%^&*()-_=+[]{};:,.?");
    const alphabet = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;
    assert.equal(new Set(alphabet).size, alphabet.length);
  });
});

describe("password validation", () => {
  for (const length of [undefined, null, "16", "32", true, false, NaN, Infinity,
    -Infinity, -1, 0, 129, 1.5, 8.5, 16.1, [], {}, 16n]) {
    it(`rejects invalid length ${String(length)} (${typeof length})`, () => {
      assert.throws(() => validatePasswordLength(length), RangeError);
      assert.throws(() => generatePassword(length), RangeError);
      assert.throws(() => generatePassword(length, true), RangeError);
    });
  }

  it("accepts every integer in the inclusive range", () => {
    for (let length = MIN_LENGTH; length <= MAX_LENGTH; length += 1) {
      assert.doesNotThrow(() => validatePasswordLength(length));
    }
  });

  it("rejects non-boolean symbol modes", () => {
    for (const mode of [null, 0, 1, "true", "false", [], {}]) {
      assert.throws(() => generatePassword(16, mode), TypeError);
    }
  });
});

function assertPassword(password, length, withSymbols) {
  // Assertion messages never include generated text, even on test failure.
  assert.equal(password.length, length, "Incorrect password length");
  const classes = [UPPERCASE, LOWERCASE, DIGITS];
  if (withSymbols) classes.push(SYMBOLS);
  const alphabet = classes.join("");
  assert.ok([...password].every((character) => alphabet.includes(character)),
    "Password contains a disallowed character");
  if (length >= classes.length) {
    for (const characters of classes) {
      assert.ok([...password].some((character) => characters.includes(character)),
        "Password is missing an enabled character class");
    }
  }
}

describe("generatePassword", () => {
  for (const withSymbols of [false, true]) {
    it(`preserves length and required character classes for every valid length (symbols: ${withSymbols})`, () => {
      for (let length = MIN_LENGTH; length <= MAX_LENGTH; length += 1) {
        assertPassword(generatePassword(length, withSymbols), length, withSymbols);
      }
    });

    for (const length of [1, 2, 3, 4, 8, 16, 32, 128]) {
      it(`preserves invariants across repeated generation at length ${length} (symbols: ${withSymbols})`, () => {
        for (let sample = 0; sample < 64; sample += 1) {
          assertPassword(generatePassword(length, withSymbols), length, withSymbols);
        }
      });
    }
  }

  it("defaults to alphanumeric mode, including explicit undefined", () => {
    assertPassword(generatePassword(16), 16, false);
    assertPassword(generatePassword(32, undefined), 32, false);
  });

  it("does not use Math.random", () => {
    const random = mock.method(Math, "random", () => {
      throw new Error("Math.random must not generate passwords");
    });
    try {
      assertPassword(generatePassword(16), 16, false);
      assertPassword(generatePassword(32, true), 32, true);
      assert.equal(random.mock.callCount(), 0);
    } finally {
      random.mock.restore();
    }
  });
});
