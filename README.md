# penman

Convert markdown to rich text styled for any platform and drop it on the clipboard ready to paste.

Penman takes markdown, applies platform-specific design tokens (fonts, colors, code styling), renders it to HTML with inline styles, and copies it to your macOS clipboard as rich text. Paste into Slack, Teams, Discord, Word, Google Docs, Notion, Outlook, Gmail, Confluence, Jira, or PowerPoint — it just works.

## Install

Penman is a Claude Code plugin. Add it to your `claude` alias:

```bash
claude --plugin-dir /path/to/penman
```

Or install from a marketplace:

```bash
claude plugin marketplace add <source>
claude plugin install penman@<marketplace>
```

Then run `/penman:install` to set up dependencies.

## Usage

### Slash command

```
/penman:pen --slack
/penman:pen --teams ./notes.md
/penman:pen --word --dark
/penman:pen --notion
```

Pass a `--<platform>` flag and optionally a file path or inline text. If anything is missing, it asks.

### MCP tools

The plugin exposes three MCP tools that Claude can call directly:

- **`penman`** — convert + copy to clipboard
- **`penman_html`** — convert + return HTML (no clipboard side-effect)
- **`penman_platforms`** — list available platforms grouped by category

### CLI

```bash
penman --for slack < notes.md
penman --for word --theme dark notes.md
penman --for gmail --tokens  # print resolved design tokens
```

## Platforms

| Category | Platforms |
|---|---|
| Chat | slack, teams, discord |
| Document | word, google-docs, notion |
| Email | outlook, gmail |
| Wiki | confluence, jira |
| Presentation | powerpoint, google-slides |

Each platform has its own font stack, font sizes, colors, and code styling — matched to what the target app uses natively.

## How it works

1. **Resolve tokens** — merge base theme (light/dark) + platform overrides + user config (`~/.penman.json5`)
2. **Render** — parse markdown with [marked](https://github.com/markedjs/marked), syntax-highlight code with [highlight.js](https://github.com/highlightjs/highlight.js), apply all styles as inline `style=""` attributes (no `<style>` blocks — they get stripped by every paste target)
3. **Copy** — hex-encode the HTML and set the clipboard via `osascript` with both `«class HTML»` and plain-text flavors

### Platform-aware rendering

- **Chat platforms** (Slack, Teams, Discord): flat HTML with `<strong>` headings, `<br>` spacing, text-aligned tables in `<pre>` blocks. These platforms aggressively strip HTML structure on paste.
- **Document/email/wiki platforms**: semantic HTML (`<h1>`, `<p>`, `<table>`) with explicit inline styles on every element. Absolute `pt`/`px` font sizes — no `em` units.

### Design tokens

Override tokens globally or per-platform in `~/.penman.json5`:

```json5
{
  // Global overrides
  "tokens": {
    "codeFontFamily": "Fira Code, monospace"
  },
  // Per-platform overrides
  "platforms": {
    "slack": {
      "tokens": { "fontFamily": "Inter, sans-serif" }
    }
  }
}
```

Run `penman --for <platform> --tokens` to see all available tokens for a platform.

## Requirements

- macOS (uses `osascript` for clipboard, `textutil` for plain-text fallback)
- [Bun](https://bun.sh) runtime

## License

ISC
