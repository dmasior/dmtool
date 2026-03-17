import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as json from "./json.pure.js";

describe("validate", () => {
  it("returns valid for valid JSON object", () => {
    assert.deepStrictEqual(json.validate('{"a":1}'), { valid: true });
  });

  it("returns valid for valid JSON array", () => {
    assert.deepStrictEqual(json.validate("[1,2,3]"), { valid: true });
  });

  it("returns valid for JSON string", () => {
    assert.deepStrictEqual(json.validate('"hello"'), { valid: true });
  });

  it("returns valid for JSON number", () => {
    assert.deepStrictEqual(json.validate("42"), { valid: true });
  });

  it("returns valid for JSON null", () => {
    assert.deepStrictEqual(json.validate("null"), { valid: true });
  });

  it("returns invalid for malformed JSON", () => {
    const result = json.validate("{bad}");
    assert.equal(result.valid, false);
    assert.ok(result.error);
  });

  it("returns invalid for empty string", () => {
    const result = json.validate("");
    assert.equal(result.valid, false);
  });

  it("returns invalid for plain text", () => {
    const result = json.validate("hello world");
    assert.equal(result.valid, false);
  });
});

describe("beautifyTwoSpaces", () => {
  it("formats compact JSON with 2 spaces", () => {
    const result = json.beautifyTwoSpaces('{"a":1,"b":2}');
    assert.equal(result, '{\n  "a": 1,\n  "b": 2\n}');
  });

  it("formats nested JSON", () => {
    const result = json.beautifyTwoSpaces('{"a":{"b":1}}');
    assert.equal(result, '{\n  "a": {\n    "b": 1\n  }\n}');
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => json.beautifyTwoSpaces("not json"));
  });
});

describe("beautifyTabs", () => {
  it("formats compact JSON with tabs", () => {
    const result = json.beautifyTabs('{"a":1}');
    assert.equal(result, '{\n\t"a": 1\n}');
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => json.beautifyTabs("{invalid}"));
  });
});

describe("minify", () => {
  it("minifies formatted JSON", () => {
    const input = '{\n  "a": 1,\n  "b": 2\n}';
    assert.equal(json.minify(input), '{"a":1,"b":2}');
  });

  it("minifies already compact JSON (no-op)", () => {
    assert.equal(json.minify('{"a":1}'), '{"a":1}');
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => json.minify("not json"));
  });
});

describe("escape", () => {
  it("escapes a simple string", () => {
    assert.equal(json.escape("hello"), '"hello"');
  });

  it("escapes special characters", () => {
    assert.equal(json.escape('line1\nline2'), '"line1\\nline2"');
  });

  it("escapes quotes", () => {
    assert.equal(json.escape('say "hi"'), '"say \\"hi\\""');
  });

  it("escapes tabs", () => {
    assert.equal(json.escape("a\tb"), '"a\\tb"');
  });

  it("escapes backslashes", () => {
    assert.equal(json.escape("a\\b"), '"a\\\\b"');
  });

  it("handles empty string", () => {
    assert.equal(json.escape(""), '""');
  });

  it("escapes a JSON string (double-encoding)", () => {
    const input = '{"key":"value"}';
    const result = json.escape(input);
    assert.equal(result, '"{\\"key\\":\\"value\\"}"');
  });
});

describe("unescape", () => {
  it("unescapes a JSON-encoded string", () => {
    assert.equal(json.unescape('"hello"'), "hello");
  });

  it("unescapes special characters", () => {
    assert.equal(json.unescape('"line1\\nline2"'), "line1\nline2");
  });

  it("unescapes quotes", () => {
    assert.equal(json.unescape('"say \\"hi\\""'), 'say "hi"');
  });

  it("unescapes a double-encoded JSON string", () => {
    const input = '"{\\"key\\":\\"value\\"}"';
    assert.equal(json.unescape(input), '{"key":"value"}');
  });

  it("throws on non-string JSON value (number)", () => {
    assert.throws(() => json.unescape("42"), {
      name: "TypeError",
      message: "Expected a JSON-encoded string",
    });
  });

  it("throws on non-string JSON value (array)", () => {
    assert.throws(() => json.unescape("[1,2,3]"), {
      name: "TypeError",
      message: "Expected a JSON-encoded string",
    });
  });

  it("throws on non-string JSON value (object)", () => {
    assert.throws(() => json.unescape('{"a":1}'), {
      name: "TypeError",
      message: "Expected a JSON-encoded string",
    });
  });

  it("throws on non-string JSON value (null)", () => {
    assert.throws(() => json.unescape("null"), {
      name: "TypeError",
      message: "Expected a JSON-encoded string",
    });
  });

  it("throws on non-string JSON value (boolean)", () => {
    assert.throws(() => json.unescape("true"), {
      name: "TypeError",
      message: "Expected a JSON-encoded string",
    });
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => json.unescape("not json"));
  });
});
