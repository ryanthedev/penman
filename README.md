# penman

You write markdown. You paste it somewhere. It looks like garbage.

Penman fixes that. Give it markdown and a target (Slack, Word, Gmail, whatever), and it puts styled rich text on your clipboard. Cmd+V. Done. Code blocks have syntax highlighting. Tables have borders. Headings look like headings. Fonts match what the app actually uses.

## Install

It's a Claude Code plugin. Add it to your `claude` alias:

```bash
claude --plugin-dir /path/to/penman
```

Then run `/penman:install` to pull dependencies (needs [Bun](https://bun.sh)).

## Usage

```
/penman:pen --slack
/penman:pen --teams ./notes.md
/penman:pen --word --dark
```

Pass a platform flag. Optionally pass a file or inline text. If you leave something out, it asks.

There's also a CLI if you want it:

```bash
penman --for slack < notes.md
penman --for word --theme dark notes.md
```

### MCP tools

Three tools Claude can call directly:

- `penman` — convert and copy to clipboard
- `penman_html` — convert and return the HTML (doesn't touch clipboard)
- `penman_platforms` — list what's available

## Platforms

| | |
|---|---|
| Chat | slack, teams, discord |
| Document | word, google-docs, notion |
| Email | outlook, gmail |
| Wiki | confluence, jira |
| Presentation | powerpoint, google-slides |

Each one has its own font stack, sizes, and colors matched to what the app uses natively. Slack gets Lato at 15px. Word gets Calibri at 11pt. Gmail gets Arial at 14px. And so on.

## How it works

Three steps:

1. **Tokens** — pick the right fonts, colors, and code styling for the platform and theme (light/dark). User overrides from `~/.penman.json5` get merged in.
2. **Render** — [marked](https://github.com/markedjs/marked) parses the markdown, [highlight.js](https://github.com/highlightjs/highlight.js) handles syntax highlighting, and everything gets inline `style` attributes. No `<style>` blocks. Every paste target strips those.
3. **Clipboard** — hex-encode the HTML, set it via `osascript` as `«class HTML»` with a plain-text fallback.

### Chat vs. document rendering

Slack, Teams, and Discord strip most HTML structure on paste. `<h1>` becomes nothing. `<p>` collapses. `<table>` dumps cell contents inline. So penman renders chat platforms differently: `<strong>` for headings, `<br>` for spacing, text-aligned tables inside `<pre>` blocks.

Document and email platforms (Word, Notion, Outlook, Gmail) get real semantic HTML with explicit inline styles on every element. Absolute `pt`/`px` font sizes, not `em`.

### Custom tokens

Override anything globally or per-platform in `~/.penman.json5`:

```json5
{
  "tokens": {
    "codeFontFamily": "Fira Code, monospace"
  },
  "platforms": {
    "slack": {
      "tokens": { "fontFamily": "Inter, sans-serif" }
    }
  }
}
```

Run `penman --for <platform> --tokens` to see what's available.

## Requirements

- macOS (clipboard uses `osascript` and `textutil`)
- [Bun](https://bun.sh)

## License

ISC
