import { setTimeout as sleep } from "node:timers/promises";

// Public Codex OAuth client, also used by OpenCode's ChatGPT integration.
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
const API = "https://chatgpt.com/backend-api/codex";

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(120000) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Network error — check your connection or try again");
  }
  return res;
}

async function check(res) {
  if (res.ok) return;
  if (res.status === 401) throw new Error("OpenAI session expired — please sign in again");
  if (res.status === 429) throw new Error("OpenAI usage limit reached — try again later");
  let detail;
  try {
    const data = await res.json();
    detail = data.error?.message || data.message;
  } catch {}
  throw new Error(detail || `OpenAI request failed (${res.status})`);
}

function claims(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); }
  catch { return {}; }
}

function sessionFromTokens(data, previous = {}) {
  if (!data.access_token) throw new Error("OpenAI returned no access token");
  const identity = claims(data.id_token || data.access_token);
  const auth = identity["https://api.openai.com/auth"];
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || previous.refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    accountId: auth?.chatgpt_account_id || identity.chatgpt_account_id || previous.accountId,
    username: identity.email || previous.username || "OpenAI account",
  };
}

async function exchange(body, signal) {
  const res = await request(`${ISSUER}/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }).toString(), signal,
  });
  await check(res);
  return res.json();
}

export async function startOpenAiDeviceFlow({ signal, onCode }) {
  const res = await request(`${ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID }), signal,
  });
  await check(res);
  const data = await res.json();
  if (!data.device_auth_id || !data.user_code) throw new Error("Invalid OpenAI device authorization response");
  await onCode(data.user_code, `${ISSUER}/codex/device`);
  const interval = Math.max(parseInt(data.interval) || 5, 1) * 1000 + 3000;
  while (!signal.aborted) {
    await sleep(interval, undefined, { signal });
    const poll = await request(`${ISSUER}/api/accounts/deviceauth/token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_auth_id: data.device_auth_id, user_code: data.user_code }), signal,
    });
    if (poll.status === 403 || poll.status === 404) continue;
    await check(poll);
    const code = await poll.json();
    return sessionFromTokens(await exchange({
      grant_type: "authorization_code", code: code.authorization_code,
      code_verifier: code.code_verifier, redirect_uri: `${ISSUER}/deviceauth/callback`,
    }, signal));
  }
  signal.throwIfAborted();
}

export async function refreshOpenAiSession(session) {
  return sessionFromTokens(await exchange({ grant_type: "refresh_token", refresh_token: session.refreshToken }), session);
}

function headers(session) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    ...(session.accountId && { "ChatGPT-Account-Id": session.accountId }),
    "Content-Type": "application/json",
  };
}

export async function fetchOpenAiModels(session) {
  const res = await request(`${API}/models?client_version=0.101.0`, { headers: headers(session) });
  await check(res);
  const data = await res.json();
  if (!Array.isArray(data.models)) throw new Error("Invalid OpenAI model list");
  // This is the Codex account catalog, not the public API catalog.
  return data.models.filter((model) => model.slug && model.visibility !== "hidden")
    .map((model) => ({ id: model.slug, name: model.display_name || model.slug }));
}

export async function readCodexResponse(res) {
  let buffer = "";
  let text = "";
  let completed = false;
  const decoder = new TextDecoder();
  function event(block) {
    const payload = block.split("\n").filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n");
    if (!payload || payload === "[DONE]") return;
    const data = JSON.parse(payload);
    if (data.type === "response.output_text.delta") text += data.delta || "";
    if (data.type === "error" || data.type === "response.failed") {
      throw new Error(data.message || data.error?.message || data.response?.error?.message || "OpenAI response failed");
    }
    if (data.type === "response.incomplete") throw new Error("OpenAI response incomplete — try again");
    if (data.type === "response.completed") {
      completed = true;
      if (!text) text = (data.response?.output || []).flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text").map((item) => item.text).join("");
    }
  }
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r/g, "");
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      event(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) event(buffer);
  if (!completed) throw new Error("OpenAI connection closed before response completed");
  if (!text) throw new Error("OpenAI returned no text response");
  return text;
}

export async function openAiCompletion(session, model, messages) {
  const res = await request(`${API}/responses`, {
    method: "POST", headers: headers(session),
    body: JSON.stringify({
      model, store: false, stream: true,
      instructions: messages.filter((message) => message.role === "system").map((message) => message.content).join("\n"),
      input: messages.filter((message) => message.role !== "system").map((message) => ({
        role: message.role, content: [{ type: "input_text", text: message.content }],
      })),
    }),
  });
  await check(res);
  return readCodexResponse(res);
}
