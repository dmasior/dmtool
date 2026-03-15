# Plugins

DMTool loads plugins from `~/.dmtool/plugins/`. Each plugin is an ES module (`.js` or `.mjs`) that exports a default object with a name and a list of actions.

## Plugin structure

```js
export default {
  name: "My Plugin",
  actions: [
    {
      label: "Uppercase",
      fn: (clipboardText) => clipboardText.toUpperCase(),
    },
    {
      label: "Nested",
      submenu: [
        {
          label: "Reverse",
          fn: (clipboardText) => clipboardText.split("").reverse().join(""),
        },
      ],
    },
  ],
};
```

### Action fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Menu item label |
| `fn` | `(clipboardText: string) => string \| Promise<string>` | Receives current clipboard text, returned string is written back to clipboard |
| `submenu` | `Action[]` | Nested actions (cannot have `fn` at the same level) |

## Environment variables

Place a `.env` file in `~/.dmtool/` to provide environment variables to plugins. Standard `KEY=VALUE` format, supports `#` comments and quoted values.

```
# ~/.dmtool/.env
API_URL=https://api.example.com
API_KEY=abc123
```

Access in plugins via `process.env.API_URL`, `process.env.API_KEY`, etc.

## Example: fetch-based plugin

```js
export default {
  name: "Translate",
  actions: [
    {
      label: "To Spanish",
      fn: async (text) => {
        const { API_URL, API_KEY } = process.env;
        const res = await fetch(`${API_URL}/translate?to=es&key=${API_KEY}&text=${encodeURIComponent(text)}`);
        const data = await res.json();
        return data.translation;
      },
    },
  ],
};
```

## Notes

- Plugins are loaded once at startup. Restart DMTool after adding or modifying plugins.
- If a plugin fails to load, an error is logged into `~/.dmtool/dmtool.log` and other plugins are unaffected.
- Async `fn` functions are supported.
