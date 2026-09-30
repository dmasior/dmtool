import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createModelRefresh } from "./model-refresh.js";
import { buildMenuTemplate } from "../menu/menu.js";

const workingModel = { id: "working", name: "Working model" };
const newModel = { id: "new", name: "New model" };

function fixture() {
  const session = { token: "account-a", generation: 1 };
  const state = { models: [workingModel], selectedModel: workingModel };
  const requests = [];
  const persist = mock.fn();
  const fetchModels = mock.fn((token) => new Promise((resolve, reject) => {
    requests.push({ token, resolve, reject });
  }));
  const onSuccess = mock.fn((models, token) => {
    const selectedModel = models.find((model) => model.id === state.selectedModel?.id) || models[0] || null;
    persist(token, selectedModel);
    state.models = models;
    state.selectedModel = selectedModel;
  });
  const refresh = createModelRefresh({ fetchModels, getSession: () => session, onSuccess });
  const changeSession = (token) => {
    session.token = token;
    session.generation += 1;
    refresh.invalidate();
    state.models = [];
    state.selectedModel = null;
  };
  return { session, state, requests, persist, fetchModels, onSuccess, refresh, changeSession };
}

function settle(request, outcome) {
  if (outcome === "success") request.resolve([newModel]);
  else request.reject(new Error("Old request failed"));
}

describe("model refresh races", () => {
  for (const outcome of ["success", "failure"]) {
    it(`ignores stale ${outcome} after sign-out without state changes or persistence`, async () => {
      const f = fixture();
      const pending = f.refresh.refresh();
      f.changeSession(null);
      settle(f.requests[0], outcome);
      await assert.doesNotReject(pending);
      assert.deepEqual(f.state, { models: [], selectedModel: null });
      assert.equal(f.onSuccess.mock.callCount(), 0);
      assert.equal(f.persist.mock.callCount(), 0);
    });

    it(`ignores old-account ${outcome} while a new account refresh is pending`, async () => {
      const f = fixture();
      const old = f.refresh.refresh();
      f.changeSession("account-b");
      assert.deepEqual(f.state, { models: [], selectedModel: null });
      const current = f.refresh.refresh();
      assert.deepEqual(f.requests.map((request) => request.token), ["account-a", "account-b"]);
      settle(f.requests[0], outcome);
      await assert.doesNotReject(old);
      assert.equal(f.persist.mock.callCount(), 0);
      assert.deepEqual(f.state, { models: [], selectedModel: null });
      f.requests[1].resolve([workingModel]);
      await current;
      assert.deepEqual(f.state, { models: [workingModel], selectedModel: workingModel });
      assert.deepEqual(f.persist.mock.calls.map((call) => call.arguments), [["account-b", workingModel]]);
    });

    it(`ignores old-account ${outcome} after the new account succeeds`, async () => {
      const f = fixture();
      const old = f.refresh.refresh();
      f.changeSession("account-b");
      const current = f.refresh.refresh();
      f.requests[1].resolve([workingModel]);
      await current;
      settle(f.requests[0], outcome);
      await assert.doesNotReject(old);
      assert.deepEqual(f.state, { models: [workingModel], selectedModel: workingModel });
      assert.deepEqual(f.persist.mock.calls.map((call) => call.arguments), [["account-b", workingModel]]);
    });

    it(`ignores older overlapping ${outcome} after the latest refresh succeeds`, async () => {
      const f = fixture();
      const old = f.refresh.refresh();
      const current = f.refresh.refresh();
      f.requests[1].resolve([newModel]);
      await current;
      settle(f.requests[0], outcome);
      await assert.doesNotReject(old);
      assert.deepEqual(f.state, { models: [newModel], selectedModel: newModel });
      assert.deepEqual(f.persist.mock.calls.map((call) => call.arguments), [["account-a", newModel]]);
    });

    it(`ignores older overlapping ${outcome} even when the latest refresh fails`, async () => {
      const f = fixture();
      const originalModels = f.state.models;
      const old = f.refresh.refresh();
      const current = f.refresh.refresh();
      const error = new Error("Current request failed");
      f.requests[1].reject(error);
      await assert.rejects(current, (actual) => actual === error);
      settle(f.requests[0], outcome);
      await assert.doesNotReject(old);
      assert.equal(f.state.models, originalModels);
      assert.equal(f.state.selectedModel, workingModel);
      assert.equal(f.persist.mock.callCount(), 0);
    });
  }

  for (const field of ["token", "generation"]) {
    for (const outcome of ["success", "failure"]) {
      it(`guards changed session ${field} independently for ${outcome}`, async () => {
        const f = fixture();
        const pending = f.refresh.refresh();
        f.session[field] = field === "token" ? "account-b" : 2;
        settle(f.requests[0], outcome);
        await assert.doesNotReject(pending);
        assert.equal(f.onSuccess.mock.callCount(), 0);
        assert.equal(f.persist.mock.callCount(), 0);
      });
    }
  }

  it("invalidates pending work even if the session token remains the same", async () => {
    const f = fixture();
    const pending = f.refresh.refresh();
    f.refresh.invalidate();
    f.requests[0].resolve([newModel]);
    await pending;
    assert.equal(f.onSuccess.mock.callCount(), 0);
    assert.equal(f.persist.mock.callCount(), 0);
  });

  it("does not fetch or persist while signed out", async () => {
    const f = fixture();
    f.changeSession(null);
    await f.refresh.refresh();
    assert.equal(f.fetchModels.mock.callCount(), 0);
    assert.equal(f.persist.mock.callCount(), 0);
  });

  it("preserves usable state and routes current manual failure to menu error feedback", async () => {
    const f = fixture();
    const originalModels = f.state.models;
    const onError = mock.fn();
    const template = buildMenuTemplate({
      actions: {},
      pluginMenuItems: [],
      ai: { isSignedIn: true, username: "dev", ...f.state },
      callbacks: { onRefreshModels: () => f.refresh.refresh(), onError },
    });
    const ai = template.find((item) => item.label === "AI").submenu;
    const refreshItem = ai.find((item) => item.label === "Refresh models");
    assert.notEqual(refreshItem.enabled, false);
    const pending = refreshItem.click();
    const error = new Error("Network unavailable");
    f.requests[0].reject(error);
    await assert.doesNotReject(pending);
    assert.equal(f.state.models, originalModels);
    assert.equal(f.state.selectedModel, workingModel);
    assert.equal(f.persist.mock.callCount(), 0);
    assert.deepEqual(onError.mock.calls.map((call) => call.arguments), [[error]]);
  });

  it("applies a successful empty current response and persists null selection", async () => {
    const f = fixture();
    const pending = f.refresh.refresh();
    f.requests[0].resolve([]);
    await pending;
    assert.deepEqual(f.state, { models: [], selectedModel: null });
    assert.deepEqual(f.persist.mock.calls.map((call) => call.arguments), [["account-a", null]]);
  });
});
