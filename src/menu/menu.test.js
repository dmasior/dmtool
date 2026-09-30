import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { buildMenuTemplate } from "./menu.js";

function fixture(ai = {}) {
  const actions = Object.fromEntries(Object.entries({
    json: ["validate", "beautifyTwoSpaces", "beautifyTabs", "minify", "escape", "unescape"],
    line: ["asc", "desc"],
    trim: ["basic"],
    encDec: ["base64Encode", "base64Decode", "urlEncode", "urlDecode", "htmlEntitiesEncode", "htmlEntitiesDecode"],
    password: ["generate", "customLength"],
  }).map(([namespace, names]) => [
    namespace, Object.fromEntries(names.map((name) => [name, mock.fn()])),
  ]));
  const callbacks = Object.fromEntries([
    "onSignIn", "onSignOut", "onRefreshModels", "onSelectModel", "onAskAi", "onSelectProvider",
    "onHowToUse", "onAbout", "onQuit", "onError",
  ].map((name) => [name, mock.fn()]));
  const options = {
    actions,
    callbacks,
    pluginMenuItems: [{ label: "No plugins found", enabled: false }],
    ai: { isSignedIn: false, username: null, models: [], selectedModel: null, ...ai },
  };
  return { options, actions, callbacks, template: buildMenuTemplate(options) };
}

const labels = (items) => items.map((item) => item.label ?? item.type);
const submenu = (template, label) => template.find((item) => item.label === label).submenu;
const calls = (spy) => spy.mock.calls.map((call) => call.arguments);

describe("native menu template", () => {
  it("uses approved root order without Hash, UUID, Lines, or Slug", () => {
    const { template, actions, callbacks } = fixture();
    assert.deepEqual(labels(template), [
      "JSON", "Text", "Plugins", "Encoding", "Password", "separator",
      "AI", "separator", "How to use", "About", "Quit",
    ]);
    // Construction must not execute actions or callbacks.
    for (const namespace of Object.values(actions)) {
      for (const spy of Object.values(namespace)) assert.equal(spy.mock.callCount(), 0);
    }
    for (const spy of Object.values(callbacks)) assert.equal(spy.mock.callCount(), 0);
  });

  for (const [label, expected, routes] of [
    ["JSON", [
      "Validate", "separator", "Format (2 spaces)", "Format (tabs)", "Minify",
      "separator", "Encode as JSON string", "Decode JSON string",
    ], [
      ["json", "validate"], ["json", "beautifyTwoSpaces"], ["json", "beautifyTabs"],
      ["json", "minify"], ["json", "escape"], ["json", "unescape"],
    ]],
    ["Text", ["Sort lines ascending", "Sort lines descending", "separator", "Trim outer whitespace"], [
      ["line", "asc"], ["line", "desc"], ["trim", "basic"],
    ]],
    ["Encoding", [
      "Base64 encode", "Base64 decode", "separator", "URL encode", "URL decode",
      "separator", "HTML entities encode", "HTML entities decode",
    ], [
      ["encDec", "base64Encode"], ["encDec", "base64Decode"],
      ["encDec", "urlEncode"], ["encDec", "urlDecode"],
      ["encDec", "htmlEntitiesEncode"], ["encDec", "htmlEntitiesDecode"],
    ]],
  ]) {
    it(`${label} preserves exact labels, separators, and action routing`, async () => {
      const { template, actions, callbacks } = fixture();
      const items = submenu(template, label);
      assert.deepEqual(labels(items), expected);
      const clickable = items.filter((item) => item.click);
      for (const [index, item] of clickable.entries()) {
        await item.click();
        const [namespace, action] = routes[index];
        assert.deepEqual(calls(actions[namespace][action]), [[]]);
      }
      assert.equal(callbacks.onError.mock.callCount(), 0);
    });
  }

  it("preserves plugin groups, nested items, and their callbacks unchanged", async () => {
    const { options } = fixture();
    const pluginClick = mock.fn();
    const pluginMenuItems = Object.freeze([
      { label: "First plugin", submenu: [{ label: "Nested", submenu: [{ label: "Run", click: pluginClick }] }] },
      { label: "Second plugin", submenu: [{ label: "Other action", click: mock.fn() }] },
    ]);
    const items = submenu(buildMenuTemplate({ ...options, pluginMenuItems }), "Plugins");
    assert.equal(items, pluginMenuItems);
    assert.deepEqual(labels(items), ["First plugin", "Second plugin"]);
    await items[0].submenu[0].submenu[0].click();
    assert.deepEqual(calls(pluginClick), [[]]);
  });

  it("preserves the disabled empty-plugin placeholder", () => {
    const { options, template } = fixture();
    assert.equal(submenu(template, "Plugins"), options.pluginMenuItems);
    assert.deepEqual(submenu(template, "Plugins"), [{ label: "No plugins found", enabled: false }]);
  });

  it("keeps both password modes in one submenu and routes exact arguments", async () => {
    const { template, actions } = fixture();
    const items = submenu(template, "Password");
    assert.deepEqual(labels(items), [
      "a–z · A–Z · 0–9", "Generate 16 characters", "Custom length…", "separator",
      "a–z · A–Z · 0–9 · symbols", "Generate 16 characters", "Custom length…",
    ]);
    assert.equal(items[0].enabled, false);
    assert.equal(items[4].enabled, false);
    assert.ok(items.every((item) => !item.submenu));
    await items[1].click();
    await items[2].click();
    await items[5].click();
    await items[6].click();
    assert.deepEqual(calls(actions.password.generate), [[16, false], [16, true]]);
    assert.deepEqual(calls(actions.password.customLength), [[false], [true]]);
  });

  it("routes help, About, and Quit to injected callbacks", async () => {
    const { template, callbacks } = fixture();
    for (const [label, name] of [["How to use", "onHowToUse"], ["About", "onAbout"], ["Quit", "onQuit"]]) {
      await template.find((item) => item.label === label).click();
      assert.deepEqual(calls(callbacks[name]), [[]]);
    }
  });

  it("reports synchronous action errors through the injected error callback", async () => {
    const { template, actions, callbacks } = fixture();
    const error = new Error("Clipboard unavailable");
    actions.json.validate.mock.mockImplementation(() => { throw error; });
    await assert.doesNotReject(submenu(template, "JSON")[0].click());
    assert.deepEqual(calls(callbacks.onError), [[error]]);
  });

  it("handles rejected async help, password, and AI callbacks", async () => {
    const { template, actions, callbacks } = fixture({ isSignedIn: true });
    const error = new Error("Dialog or operation failed");
    for (const spy of [callbacks.onHowToUse, actions.password.customLength, callbacks.onRefreshModels]) {
      spy.mock.mockImplementation(async () => { throw error; });
    }
    for (const item of [
      template.find((item) => item.label === "How to use"),
      submenu(template, "Password")[2],
      submenu(template, "AI").find((item) => item.label === "Refresh models"),
    ]) await assert.doesNotReject(item.click());
    assert.deepEqual(calls(callbacks.onError), [[error], [error], [error]]);
  });
});

describe("AI menu states", () => {
  it("selects providers and shows OpenAI login when signed out", async () => {
    const { template, callbacks } = fixture({ provider: "openai", providers: [
      { id: "copilot", name: "GitHub Copilot" }, { id: "openai", name: "OpenAI (ChatGPT)" },
    ] });
    const items = submenu(template, "AI");
    assert.deepEqual(labels(items), ["Provider: OpenAI (ChatGPT)", "separator", "Sign in with OpenAI"]);
    assert.deepEqual(items[0].submenu.map((item) => item.checked), [false, true]);
    await items[0].submenu[0].click();
    assert.deepEqual(calls(callbacks.onSelectProvider), [["copilot"]]);
    await items[2].click();
    assert.deepEqual(calls(callbacks.onSignIn), [[]]);
  });
  const models = Object.freeze([
    Object.freeze({ id: "first", name: "First model" }),
    Object.freeze({ id: "second", name: "Second model" }),
  ]);

  it("shows only GitHub sign-in when signed out, even with stale model data", async () => {
    const { template, callbacks } = fixture({ models, selectedModel: models[0] });
    const items = submenu(template, "AI");
    assert.deepEqual(labels(items), ["Sign in with GitHub"]);
    await items[0].click();
    assert.deepEqual(calls(callbacks.onSignIn), [[]]);
  });

  it("disables Ask AI without models but keeps refresh and account actions", async () => {
    const { template, callbacks } = fixture({ isSignedIn: true, username: "dev", selectedModel: models[0] });
    const items = submenu(template, "AI");
    assert.deepEqual(labels(items), [
      "Ask AI…", "separator", "Model unavailable", "Refresh models",
      "separator", "Signed in as dev", "Sign out",
    ]);
    assert.equal(items[0].enabled, false);
    assert.equal(items[2].enabled, false);
    assert.equal(items[5].enabled, false);
    await items[0].click();
    assert.equal(callbacks.onAskAi.mock.callCount(), 0);
    await items[3].click();
    await items[6].click();
    assert.deepEqual(calls(callbacks.onRefreshModels), [[]]);
    assert.deepEqual(calls(callbacks.onSignOut), [[]]);
  });

  it("uses current model metadata and radio choices with persisted-selection callback", async () => {
    const { options, template, callbacks } = fixture({
      isSignedIn: true, username: "dev", models,
      selectedModel: { id: "second", name: "Outdated name" },
    });
    const items = submenu(template, "AI");
    assert.equal(items[0].enabled, true);
    assert.equal(items[2].label, "Model: Second model");
    assert.deepEqual(items[2].submenu.map(({ label, type, checked }) => ({ label, type, checked })), [
      { label: "First model", type: "radio", checked: false },
      { label: "Second model", type: "radio", checked: true },
    ]);
    await items[0].click();
    assert.deepEqual(calls(callbacks.onAskAi), [[models[1]]]);
    await items[2].submenu[0].click();
    assert.deepEqual(calls(callbacks.onSelectModel), [[models[0]]]);
    assert.equal(options.ai.selectedModel.id, "second"); // No state mutation in the builder.
    await items[3].click();
    assert.deepEqual(calls(callbacks.onRefreshModels), [[]]);
    const updated = submenu(buildMenuTemplate({ ...options, ai: { ...options.ai, selectedModel: models[0] } }), "AI");
    assert.deepEqual(updated[2].submenu.map((item) => item.checked), [true, false]);
  });

  for (const selectedModel of [null, { id: "removed", name: "Removed model" }]) {
    it(`disables Ask AI with ${selectedModel ? "stale" : "missing"} selection while allowing model selection`, async () => {
      const { template, callbacks } = fixture({ isSignedIn: true, models, selectedModel });
      const items = submenu(template, "AI");
      assert.equal(items[0].enabled, false);
      assert.equal(items[2].label, "Model: Select a model");
      assert.ok(items[2].submenu.every((item) => item.checked === false));
      await items[0].click();
      assert.equal(callbacks.onAskAi.mock.callCount(), 0);
      await items[2].submenu[1].click();
      assert.deepEqual(calls(callbacks.onSelectModel), [[models[1]]]);
    });
  }
});
