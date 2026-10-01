import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { setImmediate } from "node:timers/promises";

let text;
let readError;
let writeError;
let writes;
let errors;
let messages;

globalThis.__dmtoolElectron = {
  clipboard: {
    async readText() {
      await setImmediate();
      if (readError) throw readError;
      return text;
    },
    async writeText(value) {
      await setImmediate();
      if (writeError) throw writeError;
      assert.equal(typeof value, "string");
      writes.push(value);
    },
  },
  dialog: {
    showErrorBox: (...args) => errors.push(args),
    showMessageBoxSync: (options) => messages.push(options),
  },
  app: { getPath: () => "/unused-test-home" },
  BrowserWindow: class {},
  ipcMain: {},
};

// Load the real action modules with an asynchronous Electron clipboard mock.
const electronURL = `data:text/javascript,${encodeURIComponent(`
  export const { clipboard, dialog, app, BrowserWindow, ipcMain } = globalThis.__dmtoolElectron;
`)}`;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "electron") return { url: electronURL, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const actions = await import("./actions.js");
const { buildPluginMenuItems } = await import("../plugins/plugins.js");
hooks.deregister();

beforeEach(() => {
  text = "";
  readError = null;
  writeError = null;
  writes = [];
  errors = [];
  messages = [];
});

describe("asynchronous JSON clipboard actions", () => {
  it("minifies the reported schema and completes the clipboard write", async () => {
    text = `{
  "type": "object",
  "additionalProperties": false,
  "required": ["order", "collapsed"],
  "properties": {
    "order": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 20,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      }
    },
    "collapsed": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 20,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      }
    }
  }
}`;
    await actions.json.minify();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].includes("\n"), false);
    assert.deepEqual(JSON.parse(writes[0]), JSON.parse(text));
    assert.deepEqual(errors, []);
  });

  for (const [name, input, expected] of [
    ["beautifyTwoSpaces", '{"a":1}', '{\n  "a": 1\n}'],
    ["beautifyTabs", '{"a":1}', '{\n\t"a": 1\n}'],
    ["escape", "line1\nline2", '"line1\\nline2"'],
    ["unescape", '"line1\\nline2"', "line1\nline2"],
  ]) {
    it(`${name} transforms resolved clipboard text`, async () => {
      text = input;
      await actions.json[name]();
      assert.deepEqual(writes, [expected]);
      assert.deepEqual(errors, []);
    });
  }

  it("validates resolved clipboard text without overwriting it", async () => {
    text = '{"a":1}';
    await actions.json.validate();
    assert.equal(messages[0].message, "Valid JSON");
    assert.deepEqual(writes, []);
  });

  for (const stage of ["read", "write"]) {
    it(`reports asynchronous ${stage} failures`, async () => {
      text = '{"a":1}';
      const error = new Error(`Clipboard ${stage} failed`);
      if (stage === "read") readError = error;
      else writeError = error;
      await actions.json.minify();
      assert.deepEqual(errors, [["Error", error.message]]);
      assert.deepEqual(writes, []);
    });
  }

  it("preserves the clipboard on invalid JSON", async () => {
    text = "not json";
    await actions.json.minify();
    assert.equal(errors.length, 1);
    assert.deepEqual(writes, []);
  });
});

describe("asynchronous text and encoding clipboard actions", () => {
  for (const [group, name, input, expected] of [
    ["line", "asc", "b\na", "a\nb"],
    ["line", "desc", "a\nb", "b\na"],
    ["trim", "basic", " \nhello\t ", "hello"],
    ["encDec", "base64Encode", "hello", "aGVsbG8="],
    ["encDec", "base64Decode", "aGVsbG8=", "hello"],
    ["encDec", "htmlEntitiesEncode", "<b>&", "&lt;b&gt;&amp;"],
    ["encDec", "htmlEntitiesDecode", "&lt;b&gt;&amp;", "<b>&"],
    ["encDec", "urlEncode", "hello & world", "hello%20%26%20world"],
    ["encDec", "urlDecode", "hello%20%26%20world", "hello & world"],
  ]) {
    it(`${group}.${name} waits for clipboard reads and writes`, async () => {
      text = input;
      await actions[group][name]();
      assert.deepEqual(writes, [expected]);
    });
  }

  it("propagates clipboard read failures to callers", async () => {
    readError = new Error("Clipboard read failed");
    await assert.rejects(actions.trim.basic(), readError);
    assert.deepEqual(writes, []);
  });
});

describe("asynchronous password and plugin clipboard actions", () => {
  it("waits for generated passwords to be written without returning them", async () => {
    assert.equal(await actions.password.generate(16), undefined);
    assert.equal(writes.length, 1);
    assert.match(writes[0], /^[a-zA-Z0-9]{16}$/);
  });

  it("propagates password clipboard write failures", async () => {
    writeError = new Error("Clipboard write failed");
    await assert.rejects(actions.password.generate(16), writeError);
  });

  function pluginItem(fn) {
    return buildPluginMenuItems([{
      name: "Test plugin",
      file: "test.js",
      actions: [{ label: "Transform", fn }],
    }])[0].submenu[0];
  }

  it("passes resolved text to plugins and waits for output to be written", async () => {
    text = "input";
    const item = pluginItem(async (input) => {
      assert.equal(input, "input");
      return "output";
    });
    await item.click();
    assert.deepEqual(writes, ["output"]);
    assert.deepEqual(errors, []);
  });

  for (const stage of ["read", "write"]) {
    it(`reports plugin clipboard ${stage} failures`, async () => {
      const error = new Error(`Clipboard ${stage} failed`);
      if (stage === "read") readError = error;
      else writeError = error;
      await pluginItem(() => "output").click();
      assert.deepEqual(errors, [["Plugin error", `test.js: ${error.message}`]]);
      assert.deepEqual(writes, []);
    });
  }
});
