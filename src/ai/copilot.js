const EDITOR_VERSION = "vscode/1.95.0";

let copilotToken = null;
let copilotTokenExpiresAt = 0;

export async function getCopilotToken(oauthToken) {
  if (copilotToken && Date.now() / 1000 < copilotTokenExpiresAt - 60) {
    return copilotToken;
  }

  const res = await fetch(
    "https://api.github.com/copilot_internal/v2/token",
    {
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        Accept: "application/json",
        "Editor-Version": EDITOR_VERSION,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error("GitHub Copilot subscription required");
  }
  if (!res.ok) throw new Error("Failed to get Copilot token");

  const data = await res.json();
  copilotToken = data.token;
  copilotTokenExpiresAt = data.expires_at;
  return copilotToken;
}

export function clearCopilotToken() {
  copilotToken = null;
  copilotTokenExpiresAt = 0;
}

export async function fetchModels(oauthToken) {
  const token = await getCopilotToken(oauthToken);
  const res = await fetch("https://api.githubcopilot.com/models", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Editor-Version": EDITOR_VERSION,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Models response:", res.status, body);
    throw new Error(`Failed to fetch models (${res.status})`);
  }

  const data = await res.json();
  return data.data.map((m) => ({
    id: m.id,
    name: m.name || m.id,
  }));
}

async function sendChatRequest(token, model, messages) {
  try {
    return await fetch("https://api.githubcopilot.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Editor-Version": EDITOR_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });
  } catch {
    throw new Error("Network error — check your connection");
  }
}

function extractContent(data) {
  return data.choices[0].message.content;
}

export async function chatCompletion(oauthToken, model, messages) {
  const token = await getCopilotToken(oauthToken);
  const res = await sendChatRequest(token, model, messages);

  if (res.status === 429) throw new Error("Rate limited — try again in a moment");

  if (res.status === 401) {
    clearCopilotToken();
    const retryToken = await getCopilotToken(oauthToken);
    const retryRes = await sendChatRequest(retryToken, model, messages);
    if (!retryRes.ok) throw new Error("Session expired — please sign in again");
    return extractContent(await retryRes.json());
  }

  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const err = await res.json();
      if (err.message) msg = err.message;
    } catch {}
    throw new Error(msg);
  }

  return extractContent(await res.json());
}
