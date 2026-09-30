import { it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { fetchOpenAiModels, openAiCompletion, readCodexResponse, refreshOpenAiSession, startOpenAiDeviceFlow } from "./openai.js";

afterEach(() => mock.restoreAll());
const session = { accessToken: "access", refreshToken: "refresh", accountId: "account", username: "dev" };
const event = (data) => `data: ${JSON.stringify(data)}\n\n`;

it("fetches Codex account models including those unavailable in public API", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ models: [
    { slug: "available", display_name: "Available" },
    { slug: "hidden", visibility: "hidden" }, { slug: "unsupported", supported_in_api: false },
  ] }));
  assert.deepEqual(await fetchOpenAiModels(session), [
    { id: "available", name: "Available" }, { id: "unsupported", name: "unsupported" },
  ]);
  const [url, init] = fetch.mock.calls[0].arguments;
  assert.match(url, /backend-api\/codex\/models/);
  assert.equal(init.headers["ChatGPT-Account-Id"], "account");
});

it("sends Codex Responses payload with instructions, clipboard input and no storage", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => new Response(
    event({ type: "response.output_text.delta", delta: "Answer" }) + event({ type: "response.completed" }),
  ));
  assert.equal(await openAiCompletion(session, "model", [
    { role: "system", content: "Plain text" }, { role: "user", content: "Clipboard context: hello" },
  ]), "Answer");
  const [url, init] = fetch.mock.calls[0].arguments;
  assert.match(url, /codex\/responses$/);
  assert.deepEqual(JSON.parse(init.body), {
    model: "model", store: false, stream: true, instructions: "Plain text",
    input: [{ role: "user", content: [{ type: "input_text", text: "Clipboard context: hello" }] }],
  });
});

it("parses split UTF-8 chunks and CRLF events", async () => {
  const bytes = new TextEncoder().encode((event({ type: "response.output_text.delta", delta: "żółć" })
    + event({ type: "response.completed" })).replace(/\n/g, "\r\n"));
  const stream = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  assert.equal(await readCodexResponse(new Response(stream)), "żółć");
});

it("rejects failed, incomplete, empty and truncated streams", async () => {
  for (const [body, expected] of [
    [event({ type: "response.failed", response: { error: { message: "Denied" } } }), /Denied/],
    [event({ type: "response.incomplete" }), /incomplete/],
    [event({ type: "response.completed" }), /no text/],
    [event({ type: "response.output_text.delta", delta: "Partial" }), /before response completed/],
  ]) await assert.rejects(readCodexResponse(new Response(body)), expected);
});

it("refreshes tokens and retains identity when no id token returned", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ access_token: "new", refresh_token: "rotated", expires_in: 3600 }));
  const next = await refreshOpenAiSession(session);
  assert.equal(next.accessToken, "new");
  assert.equal(next.refreshToken, "rotated");
  assert.equal(next.accountId, "account");
  assert.equal(next.username, "dev");
  const body = new URLSearchParams(fetch.mock.calls[0].arguments[1].body);
  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("refresh_token"), "refresh");
});

it("device login shows code and supports cancellation while waiting", async () => {
  const controller = new AbortController();
  mock.method(globalThis, "fetch", async () => Response.json({ device_auth_id: "id", user_code: "CODE", interval: "1" }));
  const onCode = mock.fn((code, url) => {
    assert.equal(code, "CODE");
    assert.equal(url, "https://auth.openai.com/codex/device");
    controller.abort();
  });
  await assert.rejects(startOpenAiDeviceFlow({ signal: controller.signal, onCode }), { name: "AbortError" });
  assert.equal(onCode.mock.callCount(), 1);
});

it("reports expired sessions and usage limits", async () => {
  for (const [status, expected] of [[401, /sign in again/], [429, /usage limit/]]) {
    mock.method(globalThis, "fetch", async () => new Response("", { status }));
    await assert.rejects(fetchOpenAiModels(session), expected);
    mock.restoreAll();
  }
});

it("exchanges completed device authorization for account session", async () => {
  const identity = Buffer.from(JSON.stringify({ email: "user@example.com", "https://api.openai.com/auth": { chatgpt_account_id: "account-id" } })).toString("base64url");
  const fetch = mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/usercode")) return Response.json({ device_auth_id: "device", user_code: "CODE", interval: "1" });
    if (url.endsWith("/deviceauth/token")) return Response.json({ authorization_code: "auth-code", code_verifier: "verifier" });
    return Response.json({ access_token: "access", refresh_token: "refresh", id_token: `header.${identity}.signature`, expires_in: 3600 });
  });
  const result = await startOpenAiDeviceFlow({ signal: AbortSignal.timeout(10000), onCode: () => {} });
  assert.equal(result.accountId, "account-id");
  assert.equal(result.username, "user@example.com");
  assert.equal(result.refreshToken, "refresh");
  const exchange = new URLSearchParams(fetch.mock.calls[2].arguments[1].body);
  assert.equal(exchange.get("code"), "auth-code");
  assert.equal(exchange.get("code_verifier"), "verifier");
  assert.equal(exchange.get("redirect_uri"), "https://auth.openai.com/deviceauth/callback");
});
