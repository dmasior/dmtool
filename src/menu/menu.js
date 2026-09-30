export function buildMenuTemplate({ actions, pluginMenuItems, ai, callbacks }) {
  // Electron does not await click handlers. Handle failures before they escape.
  const click = (callback) => async () => {
    try {
      return await callback();
    } catch (error) {
      callbacks.onError(error);
    }
  };

  const selectedModel = ai.models.find(
    (model) => model.id && model.id === ai.selectedModel?.id,
  );
  const aiSubmenu = ai.isSignedIn
    ? [
        {
          label: "Ask AI…",
          enabled: Boolean(selectedModel),
          click: click(() => {
            if (selectedModel) return callbacks.onAskAi(selectedModel);
          }),
        },
        { type: "separator" },
        ai.models.length > 0
          ? {
              label: `Model: ${selectedModel?.name ?? "Select a model"}`,
              submenu: ai.models.map((model) => ({
                label: model.name,
                type: "radio",
                checked: model.id === selectedModel?.id,
                click: click(() => callbacks.onSelectModel(model)),
              })),
            }
          : { label: "Model unavailable", enabled: false },
        { label: "Refresh models", click: click(callbacks.onRefreshModels) },
        { type: "separator" },
        { label: `Signed in as ${ai.username}`, enabled: false },
        { label: "Sign out", click: click(callbacks.onSignOut) },
      ]
    : [{ label: ai.provider === "openai" ? "Sign in with OpenAI" : "Sign in with GitHub", click: click(callbacks.onSignIn) }];

  if (ai.providers) aiSubmenu.unshift({
    label: `Provider: ${ai.providers.find((item) => item.id === ai.provider)?.name || "Select a provider"}`,
    submenu: ai.providers.map((item) => ({
      label: item.name, type: "radio", checked: item.id === ai.provider,
      click: click(() => callbacks.onSelectProvider(item.id)),
    })),
  }, { type: "separator" });

  return [
    {
      label: "JSON",
      submenu: [
        { label: "Validate", click: click(() => actions.json.validate()) },
        { type: "separator" },
        { label: "Format (2 spaces)", click: click(() => actions.json.beautifyTwoSpaces()) },
        { label: "Format (tabs)", click: click(() => actions.json.beautifyTabs()) },
        { label: "Minify", click: click(() => actions.json.minify()) },
        { type: "separator" },
        { label: "Encode as JSON string", click: click(() => actions.json.escape()) },
        { label: "Decode JSON string", click: click(() => actions.json.unescape()) },
      ],
    },
    {
      label: "Text",
      submenu: [
        { label: "Sort lines ascending", click: click(() => actions.line.asc()) },
        { label: "Sort lines descending", click: click(() => actions.line.desc()) },
        { type: "separator" },
        { label: "Trim outer whitespace", click: click(() => actions.trim.basic()) },
      ],
    },
    { label: "Plugins", submenu: pluginMenuItems },
    {
      label: "Encoding",
      submenu: [
        { label: "Base64 encode", click: click(() => actions.encDec.base64Encode()) },
        { label: "Base64 decode", click: click(() => actions.encDec.base64Decode()) },
        { type: "separator" },
        { label: "URL encode", click: click(() => actions.encDec.urlEncode()) },
        { label: "URL decode", click: click(() => actions.encDec.urlDecode()) },
        { type: "separator" },
        { label: "HTML entities encode", click: click(() => actions.encDec.htmlEntitiesEncode()) },
        { label: "HTML entities decode", click: click(() => actions.encDec.htmlEntitiesDecode()) },
      ],
    },
    {
      label: "Password",
      submenu: [
        { label: "a–z · A–Z · 0–9", enabled: false },
        { label: "Generate 16 characters", click: click(() => actions.password.generate(16, false)) },
        { label: "Custom length…", click: click(() => actions.password.customLength(false)) },
        { type: "separator" },
        { label: "a–z · A–Z · 0–9 · symbols", enabled: false },
        { label: "Generate 16 characters", click: click(() => actions.password.generate(16, true)) },
        { label: "Custom length…", click: click(() => actions.password.customLength(true)) },
      ],
    },
    { type: "separator" },
    { label: "AI", submenu: aiSubmenu },
    { type: "separator" },
    { label: "How to use", click: click(callbacks.onHowToUse) },
    { label: "About", click: click(callbacks.onAbout) },
    { label: "Quit", click: click(callbacks.onQuit) },
  ];
}
